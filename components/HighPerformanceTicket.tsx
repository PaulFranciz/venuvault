"use client";

import React, { useState } from "react";
import { Button } from "./ui/button";
import { LoaderCircle, CheckCircle, AlertCircle } from "lucide-react";
import { useQueueSystem } from "@/hooks/queries/useQueueSystem";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useCircuitBreaker } from "@/hooks/useCircuitBreaker";

type HighPerformanceTicketProps = {
  eventId: string;
  ticketTypeId: string;
  eventName: string;
  ticketName: string;
  price: number;
  availableTickets: number;
};

/**
 * High Performance Ticket Component
 * Designed to handle extreme concurrent load using Redis + BullMQ
 */
export default function HighPerformanceTicket({
  eventId,
  ticketTypeId,
  eventName,
  ticketName,
  price,
  availableTickets,
}: HighPerformanceTicketProps) {
  const { user, isSignedIn } = useUser();
  const router = useRouter();
  const [quantity, setQuantity] = useState(1);
  const [reservationId, setReservationId] = useState<string | null>(null);
  const { reserveTicket, useJobStatus } = useQueueSystem();
  
  // Circuit breaker for resilience
  const { execute, status: circuitStatus } = useCircuitBreaker({
    timeout: 5000, // 5 seconds timeout
    resetTimeout: 10000, // 10 seconds before trying again
    maxFailures: 3, // Allow 3 failures before opening circuit
  });

  // Job status checking
  const { data: jobStatus, isLoading: jobStatusLoading } = useJobStatus(
    reservationId || undefined,
    reservationId ? 'ticketReservation' : undefined
  );

  // Handle ticket purchase
  const handlePurchase = async () => {
    if (!isSignedIn) {
      toast.error("Please sign in to purchase tickets");
      return;
    }
    
    if (availableTickets < quantity) {
      toast.error("Not enough tickets available");
      return;
    }
    
    try {
      // Use circuit breaker to prevent cascading failures
      const result = await execute(() => 
        reserveTicket.mutateAsync({
          eventId,
          ticketTypeId,
          quantity,
        })
      );
      
      if (result?.jobId) {
        setReservationId(result.jobId);
        toast.success("Processing your ticket reservation...");
      }
    } catch (error: any) {
      // Already handled by circuit breaker
      console.error("Purchase failed:", error);
    }
  };

  // Generate purchase button state
  const getPurchaseButton = () => {
    // Handle circuit breaker states
    if (circuitStatus === 'open') {
      return (
        <Button disabled className="w-full bg-red-500">
          <AlertCircle className="mr-2 h-4 w-4" />
          System busy - Try again later
        </Button>
      );
    }
    
    // Handle job status states
    if (reservationId) {
      if (jobStatusLoading || !jobStatus) {
        return (
          <Button disabled className="w-full">
            <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
            Checking reservation...
          </Button>
        );
      }
      
      switch(jobStatus.state) {
        case 'waiting':
        case 'active':
        case 'delayed':
          return (
            <Button disabled className="w-full">
              <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
              Processing reservation...
            </Button>
          );
        case 'completed':
          return (
            <Button disabled className="w-full bg-green-500">
              <CheckCircle className="mr-2 h-4 w-4" />
              Tickets reserved!
            </Button>
          );
        case 'failed':
          return (
            <Button onClick={handlePurchase} className="w-full bg-red-500">
              <AlertCircle className="mr-2 h-4 w-4" />
              Failed - Try Again
            </Button>
          );
      }
    }
    
    // Default purchase button
    return (
      <Button 
        onClick={handlePurchase} 
        disabled={reserveTicket.isPending || availableTickets <= 0}
        className="w-full"
      >
        {reserveTicket.isPending ? (
          <>
            <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          `Purchase for $${price}`
        )}
      </Button>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-4">
      <h3 className="text-lg font-bold mb-2">{ticketName}</h3>
      <div className="mb-4">
        <p className="text-gray-600">Event: {eventName}</p>
        <p className="text-gray-600">Price: ${price}</p>
        <p className="text-gray-600">
          Available: {availableTickets > 0 ? availableTickets : "Sold Out"}
        </p>
      </div>
      
      <div className="flex items-center mb-4">
        <label htmlFor="quantity" className="mr-2">
          Quantity:
        </label>
        <select
          id="quantity"
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value))}
          className="border rounded p-1"
          disabled={availableTickets <= 0 || !!reservationId}
        >
          {[...Array(Math.min(availableTickets, 10))].map((_, i) => (
            <option key={i + 1} value={i + 1}>
              {i + 1}
            </option>
          ))}
        </select>
      </div>
      
      {getPurchaseButton()}
      
      {/* Live status update */}
      {jobStatus && (jobStatus.state === 'completed' || jobStatus.state === 'failed') && (
        <div className={`mt-2 p-2 rounded ${
          jobStatus.state === 'completed' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {jobStatus.state === 'completed' 
            ? 'Your tickets have been reserved successfully!' 
            : `Reservation failed: ${jobStatus.error || 'Unknown error'}`
          }
        </div>
      )}
    </div>
  );
}
