"use client";

import React, { useState, useEffect } from "react";
import { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { useQuery, useMutation } from "convex/react";
import { SignInButton, useUser } from "@clerk/nextjs";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { CalendarDays, Clock, MapPin, Heart, Ticket, Share2, Info, ArrowDown, XCircle, Users, Music } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useStorageUrl } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import JoinQueue from "@/components/JoinQueue";
import TicketSelectionModal from "@/components/TicketSelectionModal";
import TicketReservationBanner from "@/components/TicketReservationBanner";
import Spinner from "@/components/Spinner";
import ReleaseTicket from "@/components/ReleaseTicket";
import TicketTypeSelector from "@/components/TicketTypeSelector";
import useTicketStore from "@/store/ticketStore";
import HighPerformancePurchaseTicket from "@/components/HighPerformancePurchaseTicket";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export default function EventPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useUser();
  const params = useParams();
  const event = useQuery(api.events.getById, {
    eventId: params.id as Id<"events">,
  });
  const availability = useQuery(api.events.getEventAvailability, {
    eventId: params.id as Id<"events">,
  });
  const userTicket = useQuery(api.tickets.getUserTicketForEvent, {
    eventId: params.id as Id<"events">,
    userId: user?.id ?? "",
  });
  const queuePosition = useQuery(api.waitingList.getQueuePosition, {
    eventId: params.id as Id<"events">,
    userId: user?.id ?? "",
  });
  const imageUrl = useStorageUrl(event?.imageStorageId || event?.thumbnailImageStorageId);
  
  // Use Zustand store for ticket reservation state
  const {
    isModalOpen, openModal, closeModal,
    selectedTicketType, selectedQuantity, setSelectedTicket,
    showReservation, reservationExpiry, startReservation,
    cancelReservation, resetState
  } = useTicketStore();
  
  // Local UI state
  const [liked, setLiked] = useState(false);
  // Always use high performance mode as the primary ticket reservation method
  const [isDesktop, setIsDesktop] = useState(false);
  
  // Check if we're on desktop or mobile for ticket modal positioning
  useEffect(() => {
    const checkIfDesktop = () => {
      setIsDesktop(window.innerWidth >= 768); // 768px is typically the breakpoint for tablet/desktop
    };
    
    checkIfDesktop();
    window.addEventListener('resize', checkIfDesktop);
    
    return () => {
      window.removeEventListener('resize', checkIfDesktop);
    };
  }, []);

  // Initialize reservation banner if ticket is being offered
  useEffect(() => {
    if (
      queuePosition?.status === 'offered' &&
      queuePosition.offerExpiresAt &&
      queuePosition._id &&
      event &&
      params.id
    ) {
      startReservation(
        queuePosition.offerExpiresAt,
        queuePosition._id, // reservationId
        params.id as Id<"events">, // eventId
        event.name, // eventName
        imageUrl // eventBannerUrl (already derived from event image IDs)
      );
    } else if (!queuePosition || queuePosition.status !== 'offered') {
      // Only reset if we're not in an offered state
      if (showReservation && !queuePosition) {
        cancelReservation();
      }
    }
  }, [
  queuePosition,
  startReservation,
  cancelReservation,
  showReservation,
  event,
  params.id,
  imageUrl,
]);

  const handleTicketSelection = (ticketTypeId: string, quantity: number) => {
    // Find the ticket type to get name and price
    const ticketType = event?.ticketTypes?.find(t => t.id === ticketTypeId);
    if (ticketType) {
      setSelectedTicket(ticketTypeId, quantity, ticketType.name, ticketType.price);
    }
  };
  
  const handlePurchase = (ticketTypeId: string, quantity: number) => {
    // Validate inputs
    if (!ticketTypeId || !quantity || quantity < 1) {
      toast({
        title: "Invalid selection",
        description: "Please select a valid ticket type and quantity",
        variant: "destructive"
      });
      return;
    }
    
    // Ensure user is logged in
    if (!user || !user.id) {
      toast({
        title: "Not signed in",
        description: "Please sign in to purchase tickets",
        variant: "destructive"
      });
      return;
    }
    
    // Verify the ticket type exists and has availability
    const ticketType = event?.ticketTypes?.find(t => t.id === ticketTypeId);
    if (!ticketType || (ticketType.quantity !== undefined && ticketType.quantity < quantity)) {
      toast({
        title: "Tickets unavailable",
        description: "The selected tickets are no longer available",
        variant: "destructive"
      });
      return;
    }
    
    // Update store state with selected ticket and its details
    // We only store the first ticket type in the store state, but the modal handles multiple
    setSelectedTicket(ticketTypeId, quantity, ticketType.name, ticketType.price);
    
    // Show toast notification first
    toast({
      title: "Processing your tickets",
      description: "Please wait while we reserve your tickets"
    });
    
    // Set up reservation with 10 minute countdown
    const expiryTime = Date.now() + 10 * 60 * 1000; // 10 minutes
    startReservation(
      expiryTime,
      null, // reservationId - not available yet, will be updated later
      params.id as Id<"events">, // eventId
      event?.name || "Event", // eventName
      imageUrl // eventBannerUrl
    );
    
    // Trigger the join queue button with a longer delay to ensure UI and state are fully updated
    // This helps prevent issues with high-performance mode where state might not persist properly
    setTimeout(() => {
      const joinQueueBtn = document.getElementById('join-queue-btn');
      if (joinQueueBtn) {
        // Store important values in local storage as backup
        try {
          localStorage.setItem('ticwaka_last_reservation_time', String(Date.now()));
          localStorage.setItem('ticwaka_event_id', params.id as string);
        } catch (e) {
          console.error('Failed to store backup reservation data', e);
        }
        
        // Click the join queue button to complete the reservation process
        joinQueueBtn.click();
        
        // Show a single success toast notification (removed duplicates)
        // The ReservationBanner component will show the timer, so no need for redundant UI
        toast({
          title: "Tickets Reserved",
          description: "You have 10 minutes to complete your purchase."
        });
        
        // Keep modal open to show reservation status and checkout options
        // Don't automatically navigate away - let user control the flow
      } else {
        console.error('Join queue button not found');
        toast({
          title: "Something went wrong",
          description: "Please try again",
          variant: "destructive"
        });
      }
    }, 500); // Increased delay for more reliable state persistence
  };
  
  const handleReservationExpired = () => {
    cancelReservation();
    toast({
      title: "Reservation Expired",
      description: "Your ticket reservation has expired.",
      variant: "destructive",
    });
  };
  
  const isEventOwner = user?.id === event?.userId;

  // Calculate display price range - use min and max ticket type prices if multiple tickets
  const priceInfo = React.useMemo(() => {
    if (!event) return { min: 0, max: 0, hasMultipleTickets: false };
    if (event.isFreeEvent) return { min: 0, max: 0, hasMultipleTickets: false };

    if (event.ticketTypes && event.ticketTypes.length > 0) {
      // Filter visible ticket types
      const visibleTypes = event.ticketTypes.filter(t => !t.isHidden);
      if (visibleTypes.length > 0) {
        const prices = visibleTypes.map(t => Number(t.price));
        return {
          min: Math.min(...prices),
          max: Math.max(...prices),
          hasMultipleTickets: visibleTypes.length > 1
        };
      }
    }
    return { min: event.price, max: event.price, hasMultipleTickets: false };
  }, [event]);

  // Format price for display
  const formattedPrice = React.useMemo(() => {
    if (!event) return "₦0.00";
    if (event.isFreeEvent) return "Free";
    
    if (priceInfo.hasMultipleTickets) {
      return `From ₦${priceInfo.min.toLocaleString('en-NG')}`;
    } else {
      return `₦${priceInfo.min.toLocaleString('en-NG')}`;
    }
  }, [event, priceInfo]);
  
  // Format date for display in the DICE format
  const formattedDate = React.useMemo(() => {
    if (!event) return "";
    const date = new Date(event.eventDate);
    const day = date.toLocaleDateString('en-US', { weekday: 'short' });
    const dayNum = date.getDate();
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const formattedHours = hours % 12 || 12;
    const formattedMinutes = minutes.toString().padStart(2, '0');
    return `${day}, ${dayNum} ${month}, ${formattedHours}:${formattedMinutes} ${ampm}`;
  }, [event]);

  if (!event || !availability) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fcf9f4]">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fcf9f4] text-[#333333]">
      {/* Ticket Reservation Banner */}
      <TicketReservationBanner 
        expiryTime={reservationExpiry || 0} /* Provide 0 as fallback to satisfy TypeScript */
        onExpired={handleReservationExpired}
        isVisible={showReservation}
      />
      
      {/* Hero Image with orange/gold tint overlay for Ticwaka branding */}
      <div className="w-full h-[50vh] bg-[#502413] relative overflow-hidden">
        {/* Hero Image */}
        {imageUrl ? (
          <div className="w-full h-full relative">
            <Image
              src={imageUrl}
              alt={event.name}
              fill
              style={{ objectFit: "cover" }}
              className="opacity-90"
            />
            {/* Orange gradient overlay for Ticwaka branding */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#502413] via-[#F96521]/40 to-transparent"></div>
          </div>
        ) : (
          <div className="w-full h-[30vh] bg-gradient-to-b from-[#F96521] to-[#502413]"></div>
        )}
      </div>

      {/* Event Details Section - 2-column layout on desktop */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 -mt-16 relative z-10">
        <div className="flex flex-col md:flex-row md:gap-8 pb-24">
          {/* Left column for event details */}
          <div className="md:w-2/3 space-y-8">

            {/* Event Title and Basic Info */}
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <h1 className="text-4xl font-bold text-[#502413] mb-1">
                {event.name}
              </h1>
              <div className="flex items-center gap-2 text-gray-600 mb-4">
                <span className="text-sm">{(event as any).venue || event.location || 'Venue TBA'}</span>
              </div>
              <div className="flex items-center space-x-2 text-[#F96521] font-medium">
                <CalendarDays className="w-4 h-4" />
                <span>{formattedDate}</span>
              </div>
            </div>

            {/* Organizer/Venue Section */}
            <div className="flex items-center space-x-3 py-4 bg-white p-6 rounded-xl shadow-sm">
              <div className="w-12 h-12 bg-[#F96521]/10 rounded-full flex items-center justify-center">
                <Music className="w-6 h-6 text-[#F96521]" />
              </div>
              <div>
                <div className="text-gray-500 text-sm">Presented by</div>
                <div className="font-semibold text-[#502413]">{(event as any).organizer || `Organizer ID: ${event.userId}` || 'Event Organizer'}</div>
              </div>
            </div>

            {/* Location */}
            <div className="py-4 bg-white p-6 rounded-xl shadow-sm">
              <h3 className="text-xl font-semibold text-[#502413] mb-3">Location</h3>
              <div className="flex items-start space-x-3">
                <MapPin className="w-5 h-5 text-[#F96521] mt-0.5" />
                <div>
                  <div className="font-semibold text-[#502413]">{(event as any).venue || 'Venue'}</div>
                  {/* Check if this is a virtual event by seeing if the location looks like a URL */}
                  {event.location && (event.location.startsWith('http') || event.location.includes('zoom') || event.location.includes('meet.') || event.location.includes('teams.')) ? (
                    <>
                      {/* For virtual events, only show the actual link to users who have purchased tickets */}
                      {userTicket ? (
                        <div className="text-gray-700">
                          <a 
                            href={event.location.startsWith('http') ? event.location : `https://${event.location}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-500 transition-colors"
                          >
                            Join Virtual Event
                          </a>
                        </div>
                      ) : (
                        <div className="text-gray-700">
                          Virtual Event - <span className="text-amber-500">Purchase a ticket to access the link</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-gray-700">{event.location}</div>
                  )}
                </div>
              </div>
            </div>

            {/* About */}
            <div className="py-4 bg-white p-6 rounded-xl shadow-sm">
              <h3 className="text-xl font-semibold text-[#502413] mb-3">About</h3>
              <p className="text-gray-700 whitespace-pre-line">{event.description}</p>
            </div>

            {/* Additional Info */}
            <div className="py-4 bg-white p-6 rounded-xl shadow-sm">
              <div className="flex items-center mb-2">
                <Info className="w-5 h-5 text-[#F96521] mr-2" />
                <span className="text-sm font-semibold text-[#502413]">This is an {(event as any).ageRestriction || '18+'} event</span>
              </div>
            </div>
          </div>

          {/* Right column for ticket purchasing on desktop */}
          <div className="md:w-1/3 md:mt-0 mt-8">
            <div className="sticky top-4 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-2xl font-bold text-[#502413] mb-1">Get Your Ticket</h2>
                <p className="text-sm text-gray-500 mb-4">Secure your spot in this exciting event!</p>
                
                {/* Price display */}
                <div className="flex items-baseline mb-6">
                  <span className="text-3xl font-bold text-[#F96521]">{formattedPrice}</span>
                  {priceInfo.hasMultipleTickets && <span className="text-sm text-gray-500 ml-2">and up</span>}
                </div>
                
                {/* Ticket selection/reservation component */}
                {userTicket ? (
                  <div className="p-4 bg-green-50 rounded-lg border border-green-100 mb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Ticket className="w-5 h-5 text-green-600 mr-2" />
                        <span className="text-green-800 font-medium">You have a ticket!</span>
                      </div>
                      <button 
                        onClick={() => router.push(`/tickets/${userTicket._id}`)}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm transition-colors"
                      >
                        View Ticket
                      </button>
                    </div>
                  </div>
                ) : queuePosition && queuePosition.status === 'offered' ? (
                  <div className="space-y-4">
                    <TicketReservationBanner
                      expiryTime={reservationExpiry || Date.now() + 60000}
                      onExpired={handleReservationExpired}
                      ticketType={selectedTicketType}
                      quantity={selectedQuantity}
                      eventId={params.id as Id<"events">}
                    />
                    <button
                      onClick={() => {
                        const joinQueueBtn = document.getElementById('join-queue-btn');
                        if (joinQueueBtn) joinQueueBtn.click();
                      }}
                      className="w-full py-3 px-4 bg-[#F96521] hover:bg-[#e55511] text-white font-semibold rounded-lg transition-all duration-200"
                    >
                      COMPLETE PURCHASE
                    </button>
                  </div>
                ) : (
                  <div>
                    {/* High Performance Ticket Selection - Always used as primary method */}
                    <HighPerformancePurchaseTicket 
                      eventId={params.id as Id<"events">} 
                      ticketTypeId={event?.ticketTypes && event.ticketTypes.length > 0 ? event.ticketTypes[0].id : undefined}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Fixed Buy Now Button - Only shown on mobile */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-20">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <div className="text-2xl font-bold text-[#502413]">{formattedPrice}</div>
            <div className="text-xs text-gray-500">The price you'll pay. No surprises later.</div>
          </div>
          {user ? (
            userTicket ? (
              // User already has a ticket
              <button
                onClick={() => router.push(`/tickets/${userTicket._id}`)}
                className="bg-green-600 hover:bg-green-500 text-white font-semibold py-3 px-8 rounded-lg transition-all duration-200"
              >
                VIEW TICKET
              </button>
            ) : queuePosition?.status === 'offered' ? (
              // User has a ticket offer
              <div className="flex flex-col space-y-3">
                <button
                  onClick={() => {
                    const joinQueueBtn = document.getElementById('join-queue-btn');
                    if (joinQueueBtn) {
                      joinQueueBtn.click();
                    }
                  }}
                  className="bg-[#F96521] hover:bg-[#e55511] text-white font-semibold py-3 px-8 rounded-lg transition-all duration-200"
                >
                  COMPLETE PURCHASE
                </button>
                
                {queuePosition && queuePosition._id && (
                  <ReleaseTicket
                    eventId={params.id as Id<"events">}
                    waitingListId={queuePosition._id}
                  />
                )}  
              </div>
            ) : (
              // User needs to buy a ticket
              <button
                onClick={() => {
                  // Check if user is signed in first
                  if (!user || !user.id) {
                    toast({
                      title: "Not signed in",
                      description: "Please sign in to purchase tickets",
                      variant: "destructive"
                    });
                    return;
                  }

                  // Show the ticket selection modal using Zustand store
                  openModal();
                }}
                className="bg-[#F96521] hover:bg-[#e55511] text-white font-semibold py-3 px-8 rounded-lg transition-all duration-200"
              >
                {/* Dynamic button text based on ticket types */}
                {event?.ticketTypes && event.ticketTypes.length > 1 
                  ? "VIEW TICKETS" 
                  : event?.isFreeEvent 
                    ? "GET TICKET" 
                    : "BUY NOW"
                }
              </button>
            )
          ) : (
            <SignInButton>
              <button className="bg-[#F96521] hover:bg-[#e55511] text-white font-semibold py-3 px-8 rounded-lg transition-all duration-200">
                BUY NOW
              </button>
            </SignInButton>
          )}
        </div>
      </div>
      
      {/* Hidden Join Queue button for programmatic triggering */}
      <div className="hidden">
        <div id="join-queue-btn">
          <JoinQueue
            eventId={params.id as Id<"events">}
            userId={user?.id ?? ""}
            ticketTypeId={selectedTicketType || undefined}
            quantity={selectedQuantity}
          />
        </div>
      </div>
      
      {/* Hidden Release Ticket button for programmatic triggering */}
      {queuePosition?.status === 'offered' && (
        <div className="hidden">
          <div id="release-ticket-btn">
            <ReleaseTicket
              eventId={params.id as Id<"events">}
              waitingListId={queuePosition._id}
            />
          </div>
        </div>
      )}

      {isModalOpen && (
        <TicketSelectionModal
          isOpen={isModalOpen}
          onClose={closeModal}
          eventId={params.id as Id<"events">}
          onPurchase={handlePurchase}
          onJoinQueue={() => {
            const joinQueueBtn = document.getElementById('join-queue-btn');
            if (joinQueueBtn) joinQueueBtn.click();
          }}
          isDesktop={isDesktop}
        />
      )}
    </div>
  );
}
