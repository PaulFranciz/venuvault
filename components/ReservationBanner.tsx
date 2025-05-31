"use client";

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import useTicketStore from '@/store/ticketStore';
import { toast } from 'sonner';
import { Clock, X, TicketCheck, ArrowRight, TicketX } from 'lucide-react';
import { formatCurrency } from '@/lib/formatting';
import Image from 'next/image';
import { api } from "@/convex/_generated/api";
import { useMutation } from "convex/react";
import { useUser } from '@clerk/nextjs';

export default function ReservationBanner() {
  const router = useRouter();
  const { user } = useUser();
  const ticketStore = useTicketStore();
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);
  
  const releaseTicketMutation = useMutation(api.releaseTickets.releaseTicket);
  
  // Format the countdown time
  const formatCountdown = (milliseconds: number) => {
    if (milliseconds <= 0) return '0:00';
    
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };
  
  // Update the countdown timer
  useEffect(() => {
    // Check if there's an active reservation
    const hasReservation = ticketStore.hasActiveReservation();
    setVisible(hasReservation);
    
    if (!hasReservation) return;
    
    // Calculate and set initial time
    if (ticketStore.reservationExpiry) {
      const initialTimeLeft = ticketStore.reservationExpiry - Date.now();
      setTimeLeft(formatCountdown(Math.max(0, initialTimeLeft)));
    }
    
    // Set up the timer
    const timer = setInterval(() => {
      if (ticketStore.reservationExpiry) {
        const remaining = ticketStore.reservationExpiry - Date.now();
        
        if (remaining <= 0) {
          clearInterval(timer);
          setTimeLeft('0:00');
          setVisible(false);
          toast.error('Your ticket reservation has expired');
          ticketStore.resetState();
          return;
        }
        
        setTimeLeft(formatCountdown(remaining));
      }
    }, 1000);
    
    return () => clearInterval(timer);
  }, [ticketStore, ticketStore.reservationExpiry, ticketStore.isReserved]);
  
  // Check reservation on mount and handle expired tickets
  useEffect(() => {
    const checkReservation = () => {
      const isExpired = ticketStore.checkReservationExpiry();
      if (isExpired && ticketStore.reservationId) {
        toast.error('Your reservation has expired');
        ticketStore.resetState();
      }
    };
    
    checkReservation();
    
    // Check reservation when window gains focus
    const handleFocus = () => {
      checkReservation();
    };
    
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [ticketStore]);
  
  const handleContinueToCheckout = () => {
    if (!ticketStore.eventId) {
      toast.error('Missing event information. Please try again.');
      return;
    }
    
    // Make sure state is fully persisted by confirming reservation data is set
    // Ensure selectedTicketType and selectedQuantity are available
    if (!ticketStore.selectedTicketType || !ticketStore.selectedQuantity) {
      toast.error('Ticket details are missing. Please try selecting tickets again.');
      return;
    }

    try {
      // Manually store key reservation details in sessionStorage for more reliable cross-page state
      // This creates a backup that the checkout page can use if Zustand state is lost during navigation
      const checkoutData = {
        eventId: ticketStore.eventId,
        reservationId: ticketStore.reservationId,
        ticketType: ticketStore.selectedTicketType,
        quantity: ticketStore.selectedQuantity,
        ticketName: ticketStore.selectedTicketName,
        ticketPrice: ticketStore.selectedTicketPrice,
        expiry: ticketStore.reservationExpiry,
        timestamp: Date.now()
      };
      sessionStorage.setItem('checkout-data', JSON.stringify(checkoutData));

      // Force a state update to ensure all data is synchronized before navigation
      ticketStore.startReservation(
        ticketStore.reservationExpiry || Date.now() + 600000,
        ticketStore.reservationId,
        ticketStore.eventId,
        ticketStore.eventName,
        ticketStore.eventBannerUrl
      );

      // Construct URL with all necessary parameters
      const ticketParams = `ticketTypes[]=${encodeURIComponent(ticketStore.selectedTicketType)}&quantities[]=${encodeURIComponent(ticketStore.selectedQuantity)}`;
      const checkoutUrl = `/checkout/${ticketStore.eventId}?${ticketParams}`;
      
      // Log for debugging
      console.log('Navigating to checkout:', checkoutUrl);
      
      // Use window.location for hard navigation to prevent Next.js navigation issues
      // This is a more reliable approach for critical flows in high-performance mode
      setTimeout(() => {
        // Try both methods - first attempt router navigation
        try {
          router.push(checkoutUrl);
          
          // As a fallback, set a timeout to use window.location if router navigation fails
          setTimeout(() => {
            if (window.location.pathname !== `/checkout/${ticketStore.eventId}`) {
              console.log('Router navigation failed, using window.location');
              window.location.href = checkoutUrl;
            }
          }, 300);
        } catch (e) {
          console.error('Navigation error:', e);
          // Fallback to direct location change
          window.location.href = checkoutUrl;
        }
      }, 200); // Increased delay to ensure storage sync completes
    } catch (e) {
      console.error('Error during checkout navigation:', e);
      toast.error('There was a problem navigating to checkout. Please try again.');
    }
  };
  
  const handleReleaseTicket = async () => {
    if (!user || !ticketStore.reservationId) return;
    
    try {
      // Call Convex mutation to release the ticket
      await releaseTicketMutation({
        reservationId: ticketStore.reservationId,
        userId: user.id,
      });
      
      // Reset the local state
      ticketStore.resetState();
      toast.success('Ticket released successfully');
      setVisible(false);
    } catch (error) {
      console.error('Failed to release ticket:', error);
      toast.error('Failed to release ticket');
    }
  };
  
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed bottom-5 left-0 right-0 mx-auto w-full max-w-lg px-4 z-50"
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ 
            type: "spring", 
            damping: 25, 
            stiffness: 300 
          }}
        >
          <motion.div
            className="bg-white border border-[#F96521]/20 rounded-lg shadow-lg overflow-hidden"
            animate={{ height: expanded ? 'auto' : '80px' }}
          >
            {/* Collapsed view */}
            <div className="p-3 flex items-center justify-between" onClick={() => setExpanded(!expanded)}>
              <div className="flex items-center space-x-3">
                <div className="bg-[#F96521]/10 p-2 rounded-full">
                  <TicketCheck className="h-5 w-5 text-[#F96521]" />
                </div>
                <div>
                  <p className="font-medium text-sm">Ticket Reserved</p>
                  <div className="flex items-center space-x-1 text-xs text-gray-600">
                    <Clock className="h-3 w-3" />
                    <span>{timeLeft} left</span>
                  </div>
                </div>
              </div>
              
              <div className="flex space-x-2">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleContinueToCheckout();
                  }}
                  className="text-xs bg-[#F96521] text-white px-3 py-1 rounded-md hidden sm:block"
                >
                  Continue to Checkout
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpanded(!expanded);
                  }}
                  className="text-gray-500 hover:text-[#F96521]"
                >
                  {expanded ? <X className="h-5 w-5" /> : <ArrowRight className="h-5 w-5" />}
                </button>
              </div>
            </div>
            
            {/* Expanded view */}
            {expanded && (
              <div className="p-4 pt-0 border-t border-gray-100">
                <div className="flex items-center space-x-4">
                  {ticketStore.eventBannerUrl && (
                    <div className="relative h-16 w-24 rounded-md overflow-hidden">
                      <Image 
                        src={ticketStore.eventBannerUrl} 
                        alt={ticketStore.eventName || 'Event'} 
                        fill 
                        className="object-cover"
                      />
                    </div>
                  )}
                  
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">{ticketStore.eventName || 'Event Ticket'}</h4>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-1">
                      <p className="text-sm">
                        {ticketStore.selectedQuantity} × {ticketStore.selectedTicketName}
                      </p>
                      <p className="font-semibold text-[#F96521]">
                        {ticketStore.selectedTicketPrice 
                          ? formatCurrency(ticketStore.selectedTicketPrice * (ticketStore.selectedQuantity || 1))
                          : 'FREE'}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-between mt-4">
                  <button
                    onClick={handleReleaseTicket}
                    className="flex items-center space-x-1 text-sm text-gray-500 hover:text-red-500"
                  >
                    <TicketX className="h-4 w-4" />
                    <span>Release Ticket</span>
                  </button>
                  
                  <button
                    onClick={handleContinueToCheckout}
                    className="bg-[#F96521] hover:bg-[#E55511] text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    Continue to Checkout
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
