"use client";

import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { Id } from "@/convex/_generated/dataModel";

interface TicketReservationBannerProps {
  expiryTime: number; // timestamp when the reservation expires
  onExpired: () => void;
  isVisible?: boolean;
  ticketType?: string | null;
  quantity?: number;
  eventId?: Id<"events">;
}

export default function TicketReservationBanner({ 
  expiryTime, 
  onExpired,
  isVisible = true,
  ticketType,
  quantity,
  eventId
}: TicketReservationBannerProps) {
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (!isVisible) return;
    
    const calculateTimeLeft = () => {
      const now = Date.now();
      const difference = expiryTime - now;
      
      if (difference <= 0) {
        setIsExpired(true);
        onExpired();
        return 0;
      }
      
      return Math.floor(difference / 1000); // convert to seconds
    };

    setTimeLeft(calculateTimeLeft());
    
    const timer = setInterval(() => {
      const remaining = calculateTimeLeft();
      setTimeLeft(remaining);
      
      if (remaining <= 0) {
        clearInterval(timer);
      }
    }, 1000);
    
    return () => clearInterval(timer);
  }, [expiryTime, onExpired, isVisible]);
  
  if (!isVisible || isExpired) return null;
  
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  
  return (
    <div className="fixed top-0 left-0 right-0 bg-yellow-400 text-black z-50 p-3 animate-slideDown">
      <div className="flex items-center justify-center">
        <Clock className="w-5 h-5 mr-2" />
        <p className="font-medium">
          Ticket reserved for {minutes}:{seconds < 10 ? `0${seconds}` : seconds}
        </p>
      </div>
    </div>
  );
}
