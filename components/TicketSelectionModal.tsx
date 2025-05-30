"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { X, ArrowLeft, Plus, Minus, Users, Loader2 } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { format } from "date-fns";
import { useStorageUrl } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import useTicketStore from "@/store/ticketStore";
import { useToast } from "@/hooks/use-toast";

interface TicketSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: Id<"events">;
  onPurchase: (ticketTypeId: string, quantity: number) => void;
  onJoinQueue?: () => void;
  isDesktop?: boolean;
}

export default function TicketSelectionModal({
  isOpen,
  onClose,
  eventId,
  onPurchase,
  onJoinQueue,
  isDesktop = false,
}: TicketSelectionModalProps) {
  const router = useRouter();
  const event = useQuery(api.events.getById, { eventId });
  // Get ticket types from the event data
  const ticketTypes = event?.ticketTypes || [];
  const { toast } = useToast();
  
  // Use Zustand store for state management
  const {
    isReserving,
    isReserved,
    selectedTicketType: storeSelectedTicket,
    selectedQuantity: storeSelectedQuantity,
    startReservation,
    completeReservation,
    cancelReservation,
    setSelectedTicket
  } = useTicketStore();
  
  // Local state for UI interaction
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [processingTicket, setProcessingTicket] = useState<string | null>(null);
  
  // Calculate total tickets and price across all ticket types
  const totalTickets = Object.values(quantities).reduce((sum, qty) => sum + qty, 0);
  
  // Calculate total price by summing all selected ticket types
  const totalPrice = Object.entries(quantities).reduce((total, [typeId, qty]) => {
    const ticketType = ticketTypes.find((t: any) => t.id === typeId);
    if (ticketType) {
      return total + (ticketType.price * qty);
    }
    return total;
  }, 0);
  
  // For backward compatibility
  const selectedTicketType = Object.entries(quantities).find(([_, qty]) => qty > 0)?.[0];
  const selectedTicketObj = selectedTicketType ? ticketTypes.find((t: any) => t.id === selectedTicketType) : null;
  
  // Initialize quantities from store when modal opens
  useEffect(() => {
    if (isOpen && storeSelectedTicket) {
      const newQuantities: Record<string, number> = {};
      newQuantities[storeSelectedTicket] = storeSelectedQuantity;
      setQuantities(newQuantities);
    }
  }, [isOpen, storeSelectedTicket, storeSelectedQuantity]);

  if (!isOpen || !event) return null;

  const incrementQuantity = (ticketTypeId: string) => {
    // Don't allow selection if already reserving
    if (isReserving) return;
    
    // Find the ticket type object
    const ticketType = ticketTypes.find((t: any) => t.id === ticketTypeId);
    if (!ticketType) return;
    
    // Update quantities for this ticket type
    const newQuantities = { ...quantities };
    newQuantities[ticketTypeId] = (quantities[ticketTypeId] || 0) + 1;
    setQuantities(newQuantities);
    
    // If this is the first ticket being added, start the reservation process
    const totalTicketsBeforeAdd = Object.values(quantities).reduce((sum, qty) => sum + qty, 0);
    
    if (totalTicketsBeforeAdd === 0) {
      // This is the first ticket, start reservation process
      
      // Set processing state
      setProcessingTicket(ticketTypeId);
      
      // Show initial toast notification
      toast({
        title: "Processing your ticket",
        description: "Please wait while we reserve your ticket"
      });
      
      // Set 10 minute expiry time
      const expiryTime = Date.now() + 10 * 60 * 1000; // 10 minutes
      
      // Update Zustand store with reservation data and ticket details
      startReservation(expiryTime);
      
      // Trigger the purchase process with a short delay
      setTimeout(() => {
        // Call onPurchase callback with ticket details
        onPurchase(ticketTypeId, newQuantities[ticketTypeId]);
        
        // Trigger join queue callback if provided
        if (onJoinQueue) {
          setTimeout(() => onJoinQueue(), 100);
        }
        
        // Mark reservation as complete in the store after a delay
        // But keep modal open
        setTimeout(() => {
          setProcessingTicket(null);
          completeReservation();
          // Don't close modal: onClose();
        }, 1000);
      }, 500);
    }
  };

  const decrementQuantity = (ticketTypeId: string) => {
    if (!quantities[ticketTypeId] || quantities[ticketTypeId] <= 0) return;
    
    // Make a copy of the quantities
    const newQuantities = { ...quantities };
    newQuantities[ticketTypeId] = quantities[ticketTypeId] - 1;
    
    // If quantity is 0, remove this ticket type entirely from the object
    if (newQuantities[ticketTypeId] === 0) {
      delete newQuantities[ticketTypeId];
    }
    
    // Update quantities
    setQuantities(newQuantities);
    
    // If all tickets have been removed, cancel reservation
    const totalTickets = Object.values(newQuantities).reduce((sum, qty) => sum + qty, 0);
    if (totalTickets === 0) {
      cancelReservation();
    }
  };

  const handleCheckout = () => {
    if (selectedTicketType && quantities[selectedTicketType] > 0 && !isReserving) {
      // Set 10 minute expiry time
      const expiryTime = Date.now() + 10 * 60 * 1000; // 10 minutes
      
      // Update Zustand store with reservation data
      startReservation(expiryTime);
      
      // Call onPurchase callback
      onPurchase(selectedTicketType, quantities[selectedTicketType]);
      
      // Trigger join queue callback if provided
      if (onJoinQueue) {
        setTimeout(() => onJoinQueue(), 100);
      }
      
      // Mark reservation as complete after a delay
      setTimeout(() => {
        completeReservation();
        onClose();
      }, 1000);
    }
  };

  // Format event date
  let formattedDate = "TBA";
  if (event && event.eventDate) {
    const startDate = new Date(event.eventDate);
    formattedDate = format(startDate, "EEE, d MMMM, h:mm a");
  }

  // Event image URL
  const imageUrl = useStorageUrl(event?.thumbnailImageStorageId);

  // Format price for display
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount).replace('NGN', '₦');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden">
          {/* Overlay */}
          <motion.div 
            className="absolute inset-0 bg-black bg-opacity-70"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          
          {/* Modal Content - Slides up from bottom on mobile, appears from right on desktop */}
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
              <h2 className="font-bold text-xl mb-1 text-[#502413]">{event.name}</h2>
              <div className="text-[#F96521] text-sm mb-1">{formattedDate}</div>
              <div className="text-gray-600 text-sm">{(event as any).venue || event.location}</div>
            </div>
            
            {/* Ticket Selection - White Cards */}
            <div className="flex-1 overflow-y-auto bg-white">
              {ticketTypes.length > 0 ? (
                <div className="px-4 py-4 space-y-3">
                  {ticketTypes.map((ticketType: any) => {
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
                      By purchasing you'll receive an account, and agree to our general Terms of Use, Privacy Policy and the Ticket Purchase Terms. We process your personal data in accordance with our Privacy Policy.
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
              {processingTicket ? (
                <div className="w-full py-4 rounded-full text-center font-bold text-lg bg-yellow-400 text-black flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  RESERVING TICKET...
                </div>
              ) : totalTickets > 0 ? (
                <>
                  <div className="w-full p-4 rounded-lg text-center font-bold text-lg bg-green-500 text-black">
                    <div className="text-center mb-2">TICKETS RESERVED</div>
                    <div className="text-sm font-normal space-y-1">
                      {Object.entries(quantities).map(([typeId, qty]) => {
                        const ticket = ticketTypes.find((t: any) => t.id === typeId);
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
                  <div className="flex gap-3">
                    <button 
                      onClick={() => {
                        // Release the ticket
                        const releaseBtn = document.getElementById('release-ticket-btn');
                        if (releaseBtn) {
                          releaseBtn.click();
                        }
                        // Also reset modal state
                        setQuantities({});
                      }}
                      className="flex-1 py-3 rounded-full text-center font-bold border border-gray-600 text-white"
                    >
                      RELEASE TICKET
                    </button>
                    <button 
                      onClick={() => {
                        // Show a toast notification to indicate we're processing
                        toast({
                          title: "Redirecting to checkout",
                          description: "Please wait while we prepare your order"
                        });
                        
                        // Proceed to checkout with multiple tickets
                        // Filter out ticket types with zero quantity
                        const ticketParamsArray = Object.entries(quantities)
                          .filter(([_, qty]) => qty > 0)
                          .map(([typeId, qty]) => {
                            return {
                              typeId,
                              qty
                            };
                          });
                        
                        // Build a properly formatted query string
                        let ticketParams = '';
                        
                        // Add all ticket types as separate parameters
                        ticketParamsArray.forEach(({typeId, qty}) => {
                          if (ticketParams) ticketParams += '&';
                          ticketParams += `ticketTypes[]=${encodeURIComponent(typeId)}&quantities[]=${encodeURIComponent(qty)}`;
                        });
                        
                        // Use high-performance reservation mode directly instead of standard checkout flow
                        if (onJoinQueue) {
                          // Call the high-performance queue directly
                          onJoinQueue();
                          return;
                        }
                        
                        // Navigate to checkout with selected tickets
                        router.push(`/checkout/${eventId}?${ticketParams}`);
                      }}
                      className="flex-1 py-4 rounded-lg text-center font-bold bg-[#F96521] hover:bg-[#e55511] text-white transition-colors"
                      disabled={isReserving}
                    >
                      {isReserving ? (
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
                </>
              ) : (
                <div className="text-center text-gray-400 text-sm">
                  Tap the + button to select a ticket and join the queue immediately
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
