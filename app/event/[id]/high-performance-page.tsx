"use client";

import { useParams } from "next/navigation";
import Image from "next/image";
import { useState, useEffect } from "react";
import { Id } from "@/convex/_generated/dataModel";
import { useEvent } from "@/hooks/queries/useEventQueries";
import HighPerformancePurchaseTicket from "@/components/HighPerformancePurchaseTicket";
import { LoaderCircle } from "lucide-react";

export default function HighPerformanceEventPage() {
  const params = useParams();
  const eventId = params.id as string;
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  // Check if we're on desktop
  useEffect(() => {
    const checkIfDesktop = () => {
      setIsDesktop(window.innerWidth >= 768);
    };
    
    checkIfDesktop();
    window.addEventListener('resize', checkIfDesktop);
    
    return () => window.removeEventListener('resize', checkIfDesktop);
  }, []);
  
  // Use enhanced caching hook to fetch event details
  const { data: event, isLoading, error } = useEvent(eventId as Id<"events">, {
    staleTime: 1000 * 60 * 5, // 5-minute cache for event details
  });
  
  if (isLoading) {
    return (
      <div className="container mx-auto py-12 flex justify-center">
        <LoaderCircle className="w-12 h-12 animate-spin text-amber-500" />
      </div>
    );
  }
  
  if (error || !event) {
    return (
      <div className="container mx-auto py-12">
        <div className="bg-red-50 p-6 rounded-lg border border-red-200 text-red-700">
          <h2 className="text-xl font-bold mb-2">Error Loading Event</h2>
          <p>{error?.message || "Event not found"}</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-12">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Event details column */}
        <div className="md:col-span-2 space-y-6">
          <h1 className="text-3xl font-bold">{event.name}</h1>
          
          <div className="aspect-video bg-gray-200 rounded-lg overflow-hidden relative">
            {event.thumbnailImageStorageId ? (
              <Image 
                src={`/api/storage/${event.thumbnailImageStorageId}`}
                alt={event.name}
                fill
                className="object-cover"
              />
            ) : (
              <div className="flex items-center justify-center h-full bg-gray-100 text-gray-500">
                No image available
              </div>
            )}
          </div>
          
          <div className="prose max-w-none">
            <h2>About This Event</h2>
            <p>{event.description}</p>
            
            <h2>Date & Time</h2>
            <p>{new Date(event.eventDate).toLocaleDateString()} at {event.startTime || "TBD"}</p>
            
            <h2>Location</h2>
            <p>{event.location.split(',')[0] || "Venue TBD"}</p>
            <p>{event.location}</p>
          </div>
        </div>
        
        {/* Ticket column */}
        <div>
          <h2 className="text-xl font-bold mb-4">Get Tickets</h2>
          
          {/* Button to open ticket modal */}
          <button
            onClick={() => setIsModalOpen(true)}
            className="w-full py-3 px-4 bg-[#F96521] hover:bg-[#e55511] text-white font-semibold rounded-lg transition-all duration-200"
          >
            {event?.ticketTypes && event.ticketTypes.length > 1 
              ? "VIEW TICKETS" 
              : event?.isFreeEvent 
                ? "GET TICKET" 
                : "BUY NOW"
            }
          </button>
          
          <div className="mt-6 text-sm text-gray-500">
            <p>
              * Tickets are subject to availability and will be processed through our secure payment system.
              Please review all details before completing your purchase.
            </p>
          </div>
        </div>
      </div>
      
      {/* High Performance Purchase Ticket Modal */}
      <HighPerformancePurchaseTicket
        eventId={eventId as Id<"events">}
        ticketTypeId={event?.ticketTypes && event.ticketTypes.length > 0 ? event.ticketTypes[0].id : undefined}
        isModalOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        isDesktop={isDesktop}
      />
    </div>
  );
}
