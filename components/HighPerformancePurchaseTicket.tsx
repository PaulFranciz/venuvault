"use client";

import { Id } from "@/convex/_generated/dataModel";
import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import ReleaseTicket from "./ReleaseTicket";
import { Ticket, LoaderCircle, Plus, Minus, Users, Clock, AlertCircle } from "lucide-react";
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

  useEffect(() => {
    const calculateTimeRemaining = () => {
      if (isExpired) {
        setTimeRemaining("Expired");
        return;
      }

      const diff = offerExpiresAt - Date.now();
      const minutes = Math.floor(diff / 1000 / 60);
      const seconds = Math.floor((diff / 1000) % 60);

      if (minutes > 0) {
        setTimeRemaining(
          `${minutes} minute${minutes === 1 ? "" : "s"} ${seconds} second${
            seconds === 1 ? "" : "s"
          }`
        );
      } else {
        setTimeRemaining(`${seconds} second${seconds === 1 ? "" : "s"}`);
      }
    };

    if (offerExpiresAt > 0) {
        calculateTimeRemaining();
        const interval = setInterval(calculateTimeRemaining, 1000);
        return () => clearInterval(interval);
    } else {
        setTimeRemaining("--:--");
    }
  }, [offerExpiresAt, isExpired]);

  // Increment quantity for a ticket type
  const incrementQuantity = (typeId: string) => {
    setQuantities(prev => {
      const current = prev[typeId] || 0;
      // Check against available quantity
      const ticketType = event?.ticketTypes?.find(t => t.id === typeId);
      if (ticketType && ticketType.quantity !== undefined && current >= ticketType.quantity) {
        toast.error(`Sorry, only ${ticketType.quantity} tickets available.`);
        return prev;
      }
      return { ...prev, [typeId]: current + 1 };
    });
  };

  // Decrement quantity for a ticket type
  const decrementQuantity = (typeId: string) => {
    setQuantities(prev => {
      const current = prev[typeId] || 0;
      if (current <= 1) {
        const newQuantities = { ...prev };
        delete newQuantities[typeId];
        return newQuantities;
      }
      return { ...prev, [typeId]: current - 1 };
    });
  };

  // Enhanced purchase handler using Redis + BullMQ
  const handlePurchase = async () => {
    if (!user) {
      toast.error("Please sign in to purchase tickets");
      return;
    }
    
    if (isExpired) {
      toast.error("This offer has expired");
      return;
    }
    
    // If we already have a queue position, proceed to checkout
    if (queuePosition && queuePosition.status === "offered") {
      // Ensure navigation happens outside of render cycle
      setTimeout(() => {
        router.push(`/checkout/${eventId}`);
      }, 0);
      return;
    }

    // Check if we have selected any tickets
    if (totalTickets === 0 && !quantities[selectedTicketTypeId || '']) {
      toast.error("Please select at least one ticket");
      return;
    }
    
    // If no queue position, need to reserve a ticket using the high-performance system
    try {
      setIsLoading(true);
      setError(null);
      setReservationState('processing');
      
      // Prepare ticket selections - either from quantities state or fallback to selected ticket type
      let ticketSelections;
      
      if (totalTickets > 0) {
        // Use multi-ticket selection
        ticketSelections = Object.entries(quantities).map(([typeId, qty]) => ({
          ticketTypeId: typeId,
          quantity: qty
        }));
      } else {
        // Fallback to single ticket selection
        ticketSelections = [{
          ticketTypeId: selectedTicketTypeId as string,
          quantity: quantity
        }];
      }
      
      // Show toast notification to explain the reservation process
      toast.success(
        "Securing your tickets for 8 minutes! Complete your purchase before they expire.",
        { duration: 5000 }
      );
      
      // For multiple tickets, we need to use the primary ticket in the API
      // and build a URL with all ticket selections for checkout
      const result = await execute(() => 
        reserveTicket.mutateAsync({
          eventId: eventId as string,
          ticketTypeId: ticketSelections[0].ticketTypeId,
          quantity: ticketSelections[0].quantity
        })
      );
      
      if (result?.jobId) {
        setReservationId(result.jobId);
        setReservationState('reserved');
        
        // Build ticket params for checkout URL
        const ticketParams = ticketSelections
          .map(selection => `ticketTypes[]=${encodeURIComponent(selection.ticketTypeId)}&quantities[]=${encodeURIComponent(selection.quantity)}`)
          .join('&');
        
        setTimeout(() => {
          router.push(`/checkout/${eventId}?${ticketParams}`);
        }, 1000);
      }
    } catch (error: any) {
      setError(error.message || "Failed to reserve ticket");
      setReservationState('error');
      toast.error(`Reservation failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // No duplicate declaration needed since we already defined reservationState above
  
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
            <div className="sticky bottom-0 pt-3 pb-1 bg-white">
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
              
              {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
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
