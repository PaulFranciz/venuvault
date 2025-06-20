"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Button } from "./ui/button";
import { LoaderCircle, CheckCircle, AlertCircle, Clock, XCircle, ArrowLeft, X, Users, Minus, Plus, Loader2 } from "lucide-react";
import { useQueueSystem } from "@/hooks/queries/useQueueSystem";
import { useUser, SignInButton } from "@clerk/nextjs";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useCircuitBreaker } from "@/hooks/useCircuitBreaker";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useEvent, useEventAvailability } from "@/hooks/queries/useEventQueries";
import { formatCurrency } from "@/lib/formatting";
import { useStorageUrl } from "@/lib/utils";
import { format } from "date-fns";

type ReservationState = 'idle' | 'processing' | 'reserved' | 'error';

interface HighPerformancePurchaseTicketProps {
  eventId: Id<"events">;
  ticketTypeId?: string;
  isModalOpen: boolean;
  onClose: () => void;
  isDesktop?: boolean;
}

export default function HighPerformancePurchaseTicket({ 
  eventId,
  ticketTypeId,
  isModalOpen,
  onClose,
  isDesktop = false
}: HighPerformancePurchaseTicketProps) {
  const { user } = useUser();
  const router = useRouter();
  
  // Using enhanced caching for event data
  const { data: event, isLoading: eventLoading } = useEvent(eventId, {
    staleTime: 1000 * 60 * 5, // 5-minute cache for event details
  });
  
  // Skip availability loading for faster checkout - we'll check availability during reservation
  const availability = null;
  const availabilityLoading = false;

  // Use Redis + BullMQ ticket reservation system
  const { reserveTicket, useJobStatus } = useQueueSystem();
  
  // Circuit breaker for resilience
  const { execute, status: circuitStatus } = useCircuitBreaker({
    timeout: 10000, // 10 seconds timeout (increased from 5s)
    resetTimeout: 15000, // 15 seconds before trying again after failure
    maxFailures: 2, // Allow 2 failures before opening circuit (reduced for faster failover)
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
  
  // Multiple ticket selection state - like the modal
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  // Check job status if we have a reservation ID
  const { data: jobStatus, isLoading: jobStatusLoading } = useJobStatus(
    reservationId || undefined,
    reservationId ? 'ticketReservation' : undefined
  );

  // Get event image
  const imageUrl = useStorageUrl(event?.thumbnailImageStorageId || event?.imageStorageId);

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
    if (ticketTypeId && event?.ticketTypes) {
      const ticketType = event.ticketTypes.find(type => type.id === ticketTypeId);
      if (ticketType && !quantities[ticketTypeId]) {
        setQuantities({ [ticketTypeId]: 1 });
      }
    }
  }, [ticketTypeId, event?.ticketTypes, quantities]);

  // Calculate time remaining in minutes and seconds
  const calculateTimeRemaining = useCallback(() => {
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
  }, [queuePosition?.offerExpiresAt]);

  useEffect(() => {
    calculateTimeRemaining();
    const interval = setInterval(calculateTimeRemaining, 1000);
    return () => clearInterval(interval);
  }, [queuePosition, calculateTimeRemaining]);
  
  // Release reservation function
  const releaseReservation = async () => {
    setIsLoading(true);
    try {
      // Reset all local state
      setQuantities({});
      setReservationId(null);
      setReservationState('idle');
      setCanReleaseTicket(false);
      setError(null);
      
      toast.success("Tickets released successfully");
      onClose(); // Close the modal
    } catch (error) {
      toast.error("Failed to release tickets");
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
    
    // Show loading toast
    toast.loading("Reserving your tickets...", { id: 'reservation-toast', duration: 30000 });
    
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
        
        // Dismiss loading toast and show success
        toast.dismiss('reservation-toast');
        toast.success("Tickets reserved! Redirecting to checkout...");
        
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
      toast.dismiss('reservation-toast');
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

  // If modal is not open, don't render anything
  if (!isModalOpen) {
    return null;
    }

  // Loading state
  if (eventLoading || availabilityLoading) {
    return (
          <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden">
            <motion.div 
              className="absolute inset-0 bg-black bg-opacity-70"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
            />
            <motion.div 
              className="bg-white p-6 rounded-xl shadow-lg border border-amber-200 flex justify-center items-center z-10"
              initial={isDesktop ? { x: "100%", opacity: 0 } : { y: "100%" }}
              animate={isDesktop ? { x: 0, opacity: 1 } : { y: 0 }}
              exit={isDesktop ? { x: "100%", opacity: 0 } : { y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
            >
              <LoaderCircle className="w-8 h-8 animate-spin text-amber-500" />
            </motion.div>
      </div>
    );
  }

  // If queue position is offered, show the reservation status
  if (queuePosition && queuePosition.status === 'offered') {
    const isExpired = queuePosition.offerExpiresAt ? Date.now() > queuePosition.offerExpiresAt : false;
    const ticketType = event?.ticketTypes?.find(t => t.id === queuePosition.ticketTypeId);
    const ticketName = ticketType?.name || 'Ticket';
    const totalPrice = (ticketType?.price || 0) * (queuePosition.quantity || 1);

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden">
        <motion.div 
          className="absolute inset-0 bg-black bg-opacity-70"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        />
        <motion.div 
          className={`${
            isDesktop 
              ? "max-w-md md:max-w-lg h-auto max-h-[90vh] rounded-xl overflow-hidden" 
              : "w-full max-w-md rounded-t-xl overflow-hidden"
          } bg-white text-[#333333] z-10 flex flex-col`}
          initial={isDesktop ? { x: "100%", opacity: 0 } : { y: "100%" }}
          animate={isDesktop ? { x: 0, opacity: 1 } : { y: 0 }}
          exit={isDesktop ? { x: "100%", opacity: 0 } : { y: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          style={isDesktop ? { position: 'absolute', right: '2rem', top: '4rem' } : {}}
        >
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-[#502413]">
                {isExpired ? 'Offer Expired' : 'Tickets Reserved'}
              </h2>
              <button onClick={onClose} className="p-1 rounded-full bg-gray-100 h-8 w-8 flex items-center justify-center">
                <X className="w-4 h-4 text-[#502413]" />
              </button>
            </div>
            
            {isExpired ? (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                  <XCircle className="w-8 h-8 text-red-500" />
                </div>
                <p className="text-gray-600">Your ticket offer has expired. Please try again.</p>
                <button
                  onClick={onClose}
                  className="w-full py-3 px-4 bg-[#F96521] hover:bg-[#e55511] text-white font-semibold rounded-lg transition-all duration-200"
                >
                  Close
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mx-auto">
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
                
                <div className="text-center">
                  <p className="text-gray-600 mb-2">
                    You have {Math.max(0, Math.floor(((queuePosition.offerExpiresAt || 0) - Date.now()) / 60000))} minutes remaining
                  </p>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-[#F96521] h-2 rounded-full transition-all duration-1000"
                      style={{ 
                        width: `${Math.max(0, Math.min(100, ((queuePosition.offerExpiresAt || 0) - Date.now()) / (8 * 60 * 1000) * 100))}%` 
                      }}
                    ></div>
                  </div>
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
        )}
          </div>
        </motion.div>
      </div>
    );
  }

  // Main modal content with ticket selection
  return (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden">
          {/* Overlay */}
          <motion.div 
            className="absolute inset-0 bg-black bg-opacity-70"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          
      {/* Modal Content */}
          <motion.div 
            className={`${
              isDesktop 
                ? "max-w-md md:max-w-lg h-auto max-h-[90vh] rounded-xl overflow-hidden" 
                : "w-full max-w-md rounded-t-xl overflow-hidden"
            } bg-white text-[#333333] z-10 flex flex-col`}
            initial={isDesktop ? { x: "100%", opacity: 0 } : { y: "100%" }}
            animate={isDesktop ? { x: 0, opacity: 1 } : { y: 0 }}
            exit={isDesktop ? { x: "100%", opacity: 0 } : { y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            style={isDesktop ? { position: 'absolute', right: '2rem', top: '4rem' } : {}}
          >
            {/* Header with Navigation */}
            <div className="p-4 flex items-center justify-between border-b border-gray-200">
              <div className="flex items-center">
                <button onClick={onClose} className="mr-4">
                  <ArrowLeft className="w-5 h-5 text-[#502413]" />
                </button>
                <span className="text-sm text-gray-600">Ticket → Payment → Get the app</span>
              </div>
              <button onClick={onClose} className="p-1 rounded-full bg-gray-100 h-8 w-8 flex items-center justify-center">
                <X className="w-4 h-4 text-[#502413]" />
              </button>
            </div>
            
            {/* Event Info */}
            <div className="p-4 border-b border-gray-200 bg-[#fcf9f4]">
              <h2 className="font-bold text-xl mb-1 text-[#502413]">{event?.name}</h2>
          <div className="text-[#F96521] text-sm mb-1">
            {event && event.eventDate ? format(new Date(event.eventDate), "EEE, d MMMM, h:mm a") : "TBA"}
          </div>
              <div className="text-gray-600 text-sm">{event?.location}</div>
            </div>

        {/* Processing state */}
            {reservationState === 'processing' && (
              <div className="p-4 bg-[#F96521]/10 border-l-4 border-[#F96521] m-4 rounded-lg">
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
            
            {/* Ticket Selection */}
            <div className="flex-1 overflow-y-auto bg-white">
              {event?.ticketTypes && event.ticketTypes.length > 0 ? (
                <div className="px-4 py-4 space-y-3">
                  {event.ticketTypes.map((ticketType) => {
                    const isSelected = quantities[ticketType.id] > 0;
                    const ticketReleaseText = ticketType.description || 
                      (ticketType.name.includes("General") ? "(Final release)" : "(Second release)");
                    
                    return (
                      <div 
                        key={ticketType.id} 
                        className={`p-4 rounded-lg border ${isSelected ? 'border-[#F96521] bg-[#fcf9f4]' : 'border-gray-200 bg-white'}`}
                      >
                        <div className="flex items-start mb-1">
                          <Users className={`w-5 h-5 mr-2 ${isSelected ? 'text-[#F96521]' : 'text-gray-400'}`} />
                          <div className="flex flex-col w-full">
                            <div className="flex justify-between w-full">
                              <div>
                                <h3 className={`font-bold ${isSelected ? 'text-[#502413]' : 'text-[#333333]'}`}>
                                  {ticketType.name} <span className="text-gray-500 text-sm font-normal">{ticketReleaseText}</span>
                                </h3>
                                <p className={`${isSelected ? 'text-[#F96521]' : 'text-gray-700'} font-bold`}>
                                  {ticketType.price > 0 ? formatCurrency(ticketType.price) : (
                                    <span className="text-green-500 font-bold">FREE</span>
                                  )}
                                </p>
                              </div>
                              
                              {isSelected ? (
                                <div className="flex items-center gap-4 ml-auto">
                                  <button 
                                    onClick={() => decrementQuantity(ticketType.id)}
                                    className="h-8 w-8 flex items-center justify-center"
                                  >
                                    <Minus className="w-5 h-5" />
                                  </button>
                                  
                                  <span className="text-lg font-bold text-black">
                                    {quantities[ticketType.id]}
                                  </span>
                                  
                                  <button 
                                    onClick={() => incrementQuantity(ticketType.id)}
                                    className="h-8 w-8 flex items-center justify-center"
                                  >
                                    <Plus className="w-5 h-5" />
                                  </button>
                                </div>
                              ) : (
                                <button 
                                  onClick={() => incrementQuantity(ticketType.id)}
                                  className="h-10 w-10 rounded-full border border-gray-700 flex items-center justify-center ml-auto"
                                >
                                  <Plus className="w-5 h-5 text-white" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  
                  {/* Terms and Conditions */}
                  <div className="mt-6 text-xs text-gray-500 flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      <div className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3z" stroke="white" strokeWidth="2" />
                        </svg>
                      </div>
                    </div>
                    <p className="text-gray-400">
                      By purchasing you&apos;ll receive an account, and agree to our general Terms of Use, Privacy Policy and the Ticket Purchase Terms. We process your personal data in accordance with our Privacy Policy.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-gray-500">
                  No ticket types available for this event
                </div>
              )}
            </div>
            
            {/* Checkout Button or Status */}
            <div className="p-4 space-y-3">
              {/* Show error message if user needs to sign in */}
              {error && error.includes("sign in") && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center mb-3">
                    <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                    <p className="text-red-700 font-medium">Sign in required</p>
                  </div>
                  <p className="text-red-600 text-sm mb-4">Please sign in to complete your ticket purchase and secure your spot.</p>
                  <SignInButton mode="modal">
                    <button className="w-full py-3 rounded-lg text-center font-bold bg-[#F96521] hover:bg-[#e55511] text-white transition-colors">
                      Sign In to Continue
                    </button>
                  </SignInButton>
                </div>
              )}
              
          {totalTickets > 0 ? (
                <>
                  <div className="w-full p-4 rounded-lg text-center font-bold text-lg bg-green-500 text-black">
                    <div className="text-center mb-2">TICKETS SELECTED</div>
                    <div className="text-sm font-normal space-y-1">
                      {Object.entries(quantities).map(([typeId, qty]) => {
                        const ticket = event?.ticketTypes?.find((t) => t.id === typeId);
                        return (
                          <div key={typeId} className="flex justify-between">
                            <span>{qty}x {ticket?.name || 'Ticket'}</span>
                            <span>
                              {ticket && ticket.price !== undefined && ticket.price > 0 
                                ? formatCurrency(ticket.price * qty)
                                : <span className="text-green-500 font-bold">FREE</span>
                              }
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-2 pt-2 border-t border-black/20 flex justify-between">
                      <span>Total</span>
                      <span>{totalPrice > 0 ? formatCurrency(totalPrice) : <span className="text-green-500 font-bold">FREE</span>}</span>
                    </div>
                  </div>
                  
                  {!user ? (
                    <SignInButton mode="modal">
                      <button className="w-full py-4 rounded-lg text-center font-bold bg-[#F96521] hover:bg-[#e55511] text-white transition-colors">
                        {totalPrice > 0 ? (
                          <>Sign In to Purchase &middot; {formatCurrency(totalPrice)}</>
                        ) : (
                          <>Sign In to Get Ticket</>
                        )}
                      </button>
                    </SignInButton>
                  ) : (
                    <div className="flex gap-3">
                      <button 
                        onClick={releaseReservation}
                        disabled={isLoading}
                        className="flex-1 py-3 rounded-full text-center font-bold border border-gray-600 text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        {isLoading ? (
                          <div className="flex items-center justify-center">
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            RELEASING...
                          </div>
                        ) : (
                          "RELEASE TICKET"
                        )}
                      </button>
                      <button 
                        onClick={handlePurchase}
                        disabled={isLoading || reservationState === 'processing'}
                        className="flex-1 py-4 rounded-lg text-center font-bold bg-[#F96521] hover:bg-[#e55511] text-white transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                      >
                        {reservationState === 'processing' ? (
                          <div className="flex items-center justify-center">
                            <Loader2 className="w-5 h-5 animate-spin mr-2" />
                            PROCESSING...
                          </div>
                        ) : isLoading ? (
                          <div className="flex items-center justify-center">
                            <Loader2 className="w-5 h-5 animate-spin mr-2" />
                            PROCESSING...
                          </div>
                        ) : totalPrice > 0 ? (
                          <>PROCEED TO CHECKOUT &middot; {formatCurrency(totalPrice)}</>
                        ) : (
                          <>GET TICKET</>
                        )}
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center text-gray-400 text-sm">
                  Tap the + button to select a ticket and join the queue immediately
                </div>
              )}
            </div>
          </motion.div>
        </div>
  );
}
