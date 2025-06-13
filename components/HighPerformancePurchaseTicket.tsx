"use client";

import { Id } from "@/convex/_generated/dataModel";
import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import ReleaseTicket from "./ReleaseTicket";
import { Ticket, LoaderCircle, Plus, Minus, Users, Clock, AlertCircle, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useQueueSystem } from "@/hooks/queries/useQueueSystem";
import { useEvent, useEventAvailability } from "@/hooks/queries/useEventQueries";
import { useCircuitBreaker } from "@/hooks/useCircuitBreaker";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/formatting";

type ReservationState = 'idle' | 'processing' | 'reserved' | 'error';

export default function HighPerformancePurchaseTicket({ 
  eventId,
  ticketTypeId
}: { 
  eventId: Id<"events">,
  ticketTypeId?: string
}) {
  const { user } = useUser();
  const router = useRouter();
  
  // Using enhanced caching for event data
  const { data: event, isLoading: eventLoading } = useEvent(eventId, {
    staleTime: 1000 * 60 * 5, // 5-minute cache for event details
  });
  
  // Using enhanced caching for availability data
  const { data: availability, isLoading: availabilityLoading } = useEventAvailability(eventId);

  // Use Redis + BullMQ ticket reservation system
  const { reserveTicket, useJobStatus } = useQueueSystem();
  
  // Circuit breaker for resilience
  const { execute, status: circuitStatus } = useCircuitBreaker({
    timeout: 5000, // 5 seconds timeout
    resetTimeout: 10000, // 10 seconds before trying again after failure
    maxFailures: 3, // Allow 3 failures before opening circuit
  });

  // Use existing Convex query for queue position
  const queuePosition = useQuery(api.waitingList.getQueuePosition, {
    eventId,
    userId: user?.id ?? "",
  });

  const [reservationId, setReservationId] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reservationState, setReservationState] = useState<ReservationState>('idle');
  const [canReleaseTicket, setCanReleaseTicket] = useState(false);
  
  // Multiple ticket selection state
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  // Always show ticket selector by default
  const [showTicketSelector, setShowTicketSelector] = useState(true);

  // Check job status if we have a reservation ID
  const { data: jobStatus, isLoading: jobStatusLoading } = useJobStatus(
    reservationId || undefined,
    reservationId ? 'ticketReservation' : undefined
  );

  // If we don't have a queue position yet, set a future expiration time (10 minutes from now)
  // This prevents "This offer has expired" message when first accessing the page
  const defaultExpirationTime = Date.now() + 10 * 60 * 1000; // 10 minutes
  const offerExpiresAt = queuePosition?.offerExpiresAt ?? defaultExpirationTime;
  const isExpired = queuePosition ? (Date.now() > offerExpiresAt) : false;

  // Calculate total price for all selected tickets
  const totalPrice = Object.entries(quantities).reduce((sum, [typeId, qty]) => {
    if (!event?.ticketTypes) return sum;
    const ticketType = event.ticketTypes.find(type => type.id === typeId);
    return sum + (ticketType?.price || 0) * qty;
  }, 0);
  
  // Calculate total number of tickets selected
  const totalTickets = Object.values(quantities).reduce((sum, qty) => sum + qty, 0);
  
  // For backward compatibility with existing queue positions
  const quantity = queuePosition?.quantity || 1;
  let ticketPrice = event?.price || 0;
  let ticketName = "General Admission";
  let isFreeEvent = event?.isFreeEvent;
  
  const selectedTicketTypeId = ticketTypeId || queuePosition?.ticketTypeId;
  
  if (selectedTicketTypeId && event?.ticketTypes) {
    const selectedType = event.ticketTypes.find(type => type.id === selectedTicketTypeId);
    if (selectedType) {
      ticketPrice = selectedType.price;
      ticketName = selectedType.name;
    }
  }
  
  // Initialize quantities with the specified ticketTypeId if provided
  useEffect(() => {
    if (ticketTypeId && event?.ticketTypes && !showTicketSelector) {
      const ticketType = event.ticketTypes.find(type => type.id === ticketTypeId);
      if (ticketType && !quantities[ticketTypeId]) {
        setQuantities({ [ticketTypeId]: 1 });
      }
    }
  }, [ticketTypeId, event?.ticketTypes, quantities, showTicketSelector]);

  // Calculate time remaining in minutes and seconds
  const calculateTimeRemaining = () => {
    if (!queuePosition?.offerExpiresAt) {
      setTimeRemaining("");
      return;
    }

    const now = Date.now();
    const expiryTime = queuePosition.offerExpiresAt;
    const diff = expiryTime - now;

    if (diff <= 0) {
      setTimeRemaining("Expired");
      return;
    }

    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`);
  };

  useEffect(() => {
    calculateTimeRemaining();
    const interval = setInterval(calculateTimeRemaining, 1000);
    return () => clearInterval(interval);
  }, [queuePosition]);
  
  // Release a reserved ticket
  const releaseReservation = async () => {
    if (!reservationId) return;
    
    try {
      setIsLoading(true);
      // Call the release endpoint
      const response = await fetch(`/api/queue/release-ticket?id=${reservationId}`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Failed to release ticket');
      }
      
      // Reset state
      setReservationId(null);
      setReservationState('idle');
      setCanReleaseTicket(false);
      setError(null);
      
      // Show success message
      toast.success('Your ticket has been released and is available for others');
    } catch (error) {
      console.error('Error releasing ticket:', error);
      toast.error('Unable to release your ticket. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Increment quantity for a ticket type
  const incrementQuantity = (typeId: string) => {
    setQuantities((prev) => {
      const currentQty = prev[typeId] || 0;
      const maxQty = 10; // Set a reasonable maximum per ticket type
      return {
        ...prev,
        [typeId]: Math.min(currentQty + 1, maxQty)
      };
    });
  };
  
  // Decrement quantity for a ticket type
  const decrementQuantity = (typeId: string) => {
    setQuantities((prev) => {
      const currentQty = prev[typeId] || 0;
      return {
        ...prev,
        [typeId]: Math.max(currentQty - 1, 0)
      };
    });
  };

  // Enhanced purchase handler using Redis + BullMQ
  const handlePurchase = async () => {
    if (!user) {
      // User is not authenticated, redirect to sign in
      router.push("/sign-in");
      return;
    }
    
    if (reservationState === 'reserved') {
      // Already reserved, redirect to checkout
      router.push(`/checkout/${eventId}?reservation=${reservationId}`);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setReservationState('processing');
    
    try {
      // Get all selected ticket types with quantities
      const selectedTickets = Object.entries(quantities)
        .filter(([_, qty]) => qty > 0)
        .map(([typeId, quantity]) => ({ typeId, quantity }));
      
      if (selectedTickets.length === 0) {
        throw new Error("Please select at least one ticket");
      }
      
      // Define the expected return type for better TypeScript support
      type ReservationResult = {
        success: boolean;
        jobId?: string;
        error?: string;
        processingPath?: string;
      };

      // Execute the reservation with circuit breaker pattern
      const reservationResult = await execute(async () => {
        if (selectedTickets.length === 0) {
          return { success: false, error: "No tickets selected" };
        }
        
        // Use mutateAsync instead of direct function call
        const result = await reserveTicket.mutateAsync({
          eventId: eventId as string,
          ticketTypeId: selectedTickets[0].typeId, // Use first ticket's type ID
          quantity: selectedTickets[0].quantity // Use first ticket's quantity
        });
        
        // Cast the result to our expected type
        return result as ReservationResult;
      });
      
      if (reservationResult && reservationResult.success && reservationResult.jobId) {
        // Ensure jobId is not undefined before setting it
        setReservationId(reservationResult.jobId);
        setReservationState('reserved');
        setCanReleaseTicket(true); // Enable release button
        toast.success("Tickets reserved! Complete your purchase now.");
        
        // Redirect to checkout with the reservation ID
        router.push(`/checkout/${eventId}?reservation=${reservationResult.jobId}`);
      } else {
        // Handle different error cases with user-friendly messages
        if (reservationResult.error === 'SOLD_OUT') {
          setError("Sorry, these tickets are no longer available. All tickets have been sold.");
          toast.error("All tickets for this event have been sold out");
        } else if (reservationResult.error === 'QUEUE_POSITION_EXPIRED') {
          setError("Your reservation time has expired. Please try again with a fresh selection.");
          toast.error("Reservation time expired");
        } else if (reservationResult.error === 'TIMEOUT') {
          setError("The server is experiencing high demand. Please try again in a few moments.");
          toast.error("Server is busy - please try again shortly");
        } else if (reservationResult.error === 'INSUFFICIENT_TICKETS') {
          setError("There aren't enough tickets left to fulfill your request. Please select fewer tickets.");
          toast.error("Not enough tickets available");
        } else if (reservationResult.error === 'RESERVATION_FAILED') {
          setError("We couldn't reserve your tickets. This could be due to high demand. Please try again.");
          toast.error("Reservation failed - please retry");
        } else {
          setError(reservationResult.error || "Failed to reserve tickets. Please try again.");
          toast.error("Reservation error - please try again");
        }
        
        setReservationState('error');
      }
    } catch (error) {
      console.error("Error reserving tickets:", error);
      let errorMessage = "An unexpected error occurred. Please try again.";
      
      // Handle different error types with user-friendly messages
      if (error instanceof Error) {
        if (error.message.includes('timeout')) {
          errorMessage = "The server is busy processing requests. Please try again in a moment.";
        } else if (error.message.includes('network')) {
          errorMessage = "Please check your internet connection and try again.";
        } else if (error.message.includes('sold out') || error.message.includes('available')) {
          errorMessage = "These tickets are no longer available. Someone may have purchased them just now.";
        } else {
          errorMessage = error.message;
        }
      }
      
      setError(errorMessage);
      setReservationState('error');
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Track job status and update reservation state
  useEffect(() => {
    if (jobStatus && 'state' in jobStatus && jobStatus.state === 'completed') {
      setReservationState('reserved');
      toast.success("Your tickets are reserved for 8 minutes!");
      // Use setTimeout to avoid router updates during render cycle
      setTimeout(() => {
        router.push(`/checkout/${eventId}`);
      }, 0);
    } else if (jobStatus && 'state' in jobStatus && jobStatus.state === 'failed') {
      setReservationState('error');
      toast.error("Failed to reserve tickets. Please try again.");
    } else if ((jobStatus && 'state' in jobStatus && jobStatus.state === 'active') || jobStatusLoading) {
      setReservationState('processing');
    }
  }, [jobStatus, jobStatusLoading, router, eventId]);

  // Loading state
  if (eventLoading || availabilityLoading) {
    return (
      <div className="bg-white p-6 rounded-xl shadow-lg border border-amber-200 flex justify-center items-center">
        <LoaderCircle className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  // If the user already has a queue position, show the original ticket reservation UI
  // If there's a queue position that's not expired, show reservation status with smart UI
  if (queuePosition && !isExpired) {
    // Calculate percentage of time remaining for progress bar
    const startTime = queuePosition._creationTime || (Date.now() - 10000); // fallback if missing
    const expiryTime = queuePosition.offerExpiresAt || (startTime + 8 * 60 * 1000); // 8 minutes in ms
    const totalDuration = expiryTime - startTime;
    const elapsed = Date.now() - startTime;
    const percentage = Math.max(0, Math.min(100, 100 - (elapsed / totalDuration) * 100));
    
    // Determine urgency level for UI
    let urgencyColor = "#4ade80"; // green by default
    let urgencyText = "Plenty of time";
    
    if (percentage < 30) {
      urgencyColor = "#ef4444"; // red for urgent
      urgencyText = "Almost expired!";
    } else if (percentage < 60) {
      urgencyColor = "#f97316"; // orange for warning
      urgencyText = "Time running out";
    }
    
    return (
      <div className="p-6 rounded-lg border border-[#F96521]/20 bg-white shadow-md">
        <div className="space-y-4">
          {/* Header with icon and title */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-[#F96521]/10 flex items-center justify-center">
              <Ticket className="w-5 h-5 text-[#F96521]" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[#502413]">Tickets Reserved!</h3>
              <div className="flex items-center">
                <span className="text-sm font-medium" style={{ color: urgencyColor }}>{urgencyText}</span>
              </div>
            </div>
          </div>
          
          {/* Countdown timer with progress bar */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Reserved for</span>
              <div className="flex items-center">
                <Clock className="w-4 h-4 text-[#F96521] mr-1" />
                <span className="text-sm font-semibold text-[#F96521]">{timeRemaining}</span>
              </div>
            </div>
            <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full transition-all duration-1000 ease-linear rounded-full" 
                style={{ 
                  width: `${percentage}%`,
                  backgroundColor: urgencyColor 
                }}
              ></div>
            </div>
            <p className="text-sm text-gray-600">
              Complete your purchase before timer expires to secure your spot!
            </p>
          </div>
          
          {/* Ticket summary */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <h4 className="font-medium text-[#502413]">Reserved Tickets</h4>
            <div className="flex justify-between text-sm">
              <span>{queuePosition.quantity || 1}x {ticketName}</span>
              <span className="font-medium">{formatCurrency(totalPrice)}</span>
            </div>
          </div>
          
          {/* Action buttons */}
          <div className="flex justify-between gap-3">
            <button
              onClick={() => {
                // Release the reserved ticket
                if (queuePosition._id) {
                  const releaseBtn = document.getElementById('release-ticket-btn');
                  if (releaseBtn) releaseBtn.click();
                }
              }}
              className="w-full px-4 py-3 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition-colors"
            >
              Release Tickets
            </button>
            <button
              onClick={() => {
                // Redirect to checkout
                const ticketType = queuePosition.ticketTypeId || "";
                const qty = queuePosition.quantity || 1;
                router.push(`/checkout/${eventId}?ticketTypes[]=${encodeURIComponent(ticketType)}&quantities[]=${encodeURIComponent(qty)}`);
              }}
              className="w-full px-4 py-3 bg-[#F96521] hover:bg-[#e55511] text-white rounded-lg text-sm font-medium transition-colors"
            >
              Complete Purchase
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show the ticket selector UI
  return (
    <div className="rounded-lg overflow-hidden">
      {reservationState === 'processing' && (
        <div className="mb-4 p-4 bg-[#F96521]/10 rounded-lg border border-[#F96521]/20">
          <div className="flex items-center">
            <Clock className="w-5 h-5 text-[#F96521] animate-pulse mr-2" />
            <div>
              <h3 className="font-medium text-[#502413]">Reserving Your Tickets</h3>
              <p className="text-sm text-gray-600">Please wait while we secure your tickets for 8 minutes...</p>
            </div>
          </div>
          <div className="mt-3 w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-[#F96521] rounded-full animate-pulse" style={{ width: '100%' }}></div>
          </div>
        </div>
      )}
      
      {/* Always display all ticket types */}
      {event?.ticketTypes && event.ticketTypes.length > 0 ? (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-[#502413] mb-4">AVAILABLE TICKETS</h3>
          {/* Ticket Type Selection */}
          <div className="space-y-4 mb-4">
            {event?.ticketTypes?.map(ticketType => {
              const isSelected = (quantities[ticketType.id] || 0) > 0;
              const isSoldOut = ticketType.quantity !== undefined && ticketType.quantity <= 0;
              const hasEnded = ticketType.isHidden || isSoldOut; // Check if ticket sales have ended
              
              return (
                <div key={ticketType.id} className="flex flex-col">
                  {/* Ticket row - similar to the image layout */}
                  <div className="flex items-center justify-between mb-1">
                    {/* Left side - vertical gray bar and ticket info */}
                    <div className="flex items-start">
                      <div className="w-2 h-16 bg-gray-300 rounded-full mr-4 self-stretch"></div>
                      <div className="py-1">
                        <h3 className="font-medium text-[#502413]">{ticketType.name}</h3>
                        <p className="text-2xl font-bold text-[#502413]">
                          {ticketType.price > 0 ? formatCurrency(ticketType.price) : (
                            <span className="text-green-500">FREE</span>
                          )}
                        </p>
                      </div>
                    </div>
                    
                    {/* Right side - quantity controls or sold out indicator */}
                    <div className="flex items-center">
                      {hasEnded ? (
                        <div className="px-3 py-1 bg-red-100 text-red-600 text-xs font-bold rounded-full">
                          Ticket sales ended
                        </div>
                      ) : (
                        <div className="flex items-center">
                          {/* Minus button */}
                          <button 
                            onClick={() => decrementQuantity(ticketType.id)}
                            className="h-8 w-8 rounded-full border border-gray-300 flex items-center justify-center"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="w-4 h-4 text-gray-500" />
                          </button>
                          
                          {/* Quantity display */}
                          <span className="text-lg font-bold text-[#502413] mx-4">
                            {quantities[ticketType.id] || 0}
                          </span>
                          
                          {/* Plus button */}
                          <button 
                            onClick={() => incrementQuantity(ticketType.id)}
                            className="h-8 w-8 rounded-full border border-gray-300 flex items-center justify-center bg-white hover:bg-[#F96521] hover:border-[#F96521] hover:text-white transition-colors"
                            aria-label="Increase quantity"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Learn more link */}
                  <div className="flex justify-end">
                    <button className="text-sm text-[#F96521] hover:underline px-2 py-1">
                      Learn more
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Purchase Button */}
          {totalTickets > 0 && (
            <div className="sticky bottom-0 pt-3 pb-1 bg-white border-t border-gray-100 mt-4">
              <button
                onClick={handlePurchase}
                disabled={isLoading || totalTickets === 0 || reservationState === 'processing'}
                className="w-full py-3 px-4 bg-[#F96521] hover:bg-[#e55511] text-white font-semibold rounded-lg transition-all duration-200 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {reservationState === 'processing' ? (
                  <div className="flex items-center justify-center">
                    <Clock className="animate-spin w-5 h-5 mr-2" />
                    Reserving tickets for 8 minutes...
                  </div>
                ) : isLoading ? (
                  <div className="flex items-center justify-center">
                    <LoaderCircle className="animate-spin w-5 h-5 mr-2" />
                    Processing...
                  </div>
                ) : (
                  <>
                    Reserve & Checkout
                  </>
                )}
              </button>
              
              {/* Reservation information tooltip */}
              <div className="mt-3 bg-blue-50 p-3 rounded-lg flex items-start">
                <AlertCircle className="w-5 h-5 text-blue-500 mr-2 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700">
                  When you reserve tickets, they&apos;ll be held for you for 8 minutes while you complete your purchase. This ensures no one else can buy them during this time.
                </p>
              </div>
              
              {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
            </div>
          )}
        </div>
      ) : event?.ticketTypes && event.ticketTypes.length === 1 ? (
        // For single ticket type, show it with the same UI as multiple tickets
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-[#502413] mb-2">AVAILABLE TICKETS</h3>
          <div className="space-y-3 mb-4">
            {event.ticketTypes.map(ticketType => {
              const isSelected = (quantities[ticketType.id] || 0) > 0;
              const isSoldOut = ticketType.quantity !== undefined && ticketType.quantity <= 0;
              const ticketReleaseText = ticketType.description || 
                (ticketType.name.includes("General") ? "(Final release)" : "(Second release)");
              
              return (
                <div 
                  key={ticketType.id} 
                  className={`p-4 rounded-lg border ${isSelected ? 'border-[#F96521] bg-[#fcf9f4]' : 'border-gray-200 bg-white'} ${isSoldOut ? 'opacity-50' : ''}`}
                >
                  <div className="flex items-start mb-1">
                    <Users className={`w-5 h-5 mr-2 ${isSelected ? 'text-[#F96521]' : 'text-gray-400'}`} />
                    <div className="flex flex-col w-full">
                      <div className="flex justify-between w-full">
                        <div>
                          <h3 className={`font-bold ${isSelected ? 'text-[#502413]' : 'text-gray-700'}`}>
                            {ticketType.name} <span className="text-gray-500 text-sm font-normal">{ticketReleaseText}</span>
                          </h3>
                          <p className={`${isSelected ? 'text-[#F96521]' : 'text-gray-700'} font-bold`}>
                            {ticketType.price > 0 ? formatCurrency(ticketType.price) : (
                              <span className="text-green-500 font-bold">FREE</span>
                            )}
                          </p>
                          
                          {isSoldOut && (
                            <p className="text-red-500 text-sm font-medium mt-1">Sold Out</p>
                          )}
                        </div>
                        
                        {!isSoldOut && (
                          isSelected ? (
                            <div className="flex items-center gap-4 ml-auto">
                              <button 
                                onClick={() => decrementQuantity(ticketType.id)}
                                className="h-8 w-8 flex items-center justify-center text-gray-700 hover:text-[#F96521]"
                              >
                                <Minus className="w-5 h-5" />
                              </button>
                              
                              <span className="text-lg font-bold text-[#502413]">
                                {quantities[ticketType.id] || 0}
                              </span>
                              
                              <button 
                                onClick={() => incrementQuantity(ticketType.id)}
                                className="h-8 w-8 flex items-center justify-center text-gray-700 hover:text-[#F96521]"
                              >
                                <Plus className="w-5 h-5" />
                              </button>
                            </div>
                          ) : (
                            <button 
                              onClick={() => incrementQuantity(ticketType.id)}
                              className="h-10 w-10 rounded-full border border-gray-300 hover:border-[#F96521] flex items-center justify-center ml-auto"
                            >
                              <Plus className="w-5 h-5 text-gray-700 hover:text-[#F96521]" />
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Purchase Button */}
          {totalTickets > 0 && (
            <div className="sticky bottom-0 pt-3 pb-1 bg-white space-y-3">
              {canReleaseTicket && reservationState === 'reserved' ? (
                <div className="flex flex-col space-y-3">
                  <button
                    onClick={() => router.push(`/checkout/${eventId}?reservation=${reservationId}`)}
                    className="w-full py-3 px-4 bg-[#F96521] hover:bg-[#e55511] text-white font-semibold rounded-lg transition-all duration-200"
                  >
                    CONTINUE TO CHECKOUT
                  </button>
                  
                  <button
                    onClick={releaseReservation}
                    disabled={isLoading}
                    className="w-full py-3 px-4 border border-red-600 text-red-600 font-semibold rounded-lg hover:bg-red-50 transition-all duration-200 flex items-center justify-center"
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center">
                        <LoaderCircle className="animate-spin w-5 h-5 mr-2" />
                        Releasing tickets...
                      </div>
                    ) : (
                      <>
                        <XCircle className="w-5 h-5 mr-2" />
                        RELEASE TICKETS
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <button
                  onClick={handlePurchase}
                  disabled={isLoading || totalTickets === 0}
                  className="w-full py-3 px-4 bg-[#F96521] hover:bg-[#e55511] text-white font-semibold rounded-lg transition-all duration-200 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      <LoaderCircle className="animate-spin w-5 h-5 mr-2" />
                      Reserving tickets...
                    </div>
                  ) : (
                    <>
                      {totalPrice > 0 ? (
                        `GET TICKETS • ${formatCurrency(totalPrice)}`
                      ) : (
                        'GET FREE TICKET'
                      )}
                    </>
                  )}
                </button>
              )}
              
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start text-left">
                  <AlertCircle className="w-5 h-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
                  <p className="text-red-800 text-sm">{error}</p>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        // Fallback for when no ticket types are available
        <div className="p-4 text-center bg-gray-50 rounded-lg">
          <p className="text-gray-500">No tickets available for this event</p>
        </div>
      )}
    </div>
  );
}
