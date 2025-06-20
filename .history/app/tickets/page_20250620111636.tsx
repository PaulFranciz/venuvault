'use client';

import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

// Simple Loading Component to avoid hydration issues
const EnhancedTicketCard = ({ ticket, isPast = false }: { ticket: any, isPast?: boolean }) => {
  const imageUrl = useStorageUrl(ticket.event?.imageStorageId);
  const thumbnailUrl = useStorageUrl(ticket.event?.thumbnailImageStorageId);
  const displayImage = thumbnailUrl || imageUrl;

  return (
    <Link 
      href={`/tickets/${ticket._id}`}
      className="block group transform transition-all duration-200 hover:scale-105 hover:shadow-xl"
    >
      <div className={`bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden ${isPast ? 'opacity-75' : ''}`}>
        {/* Event Image */}
        {displayImage && (
          <div className="relative h-48 w-full">
            <Image
              src={displayImage}
              alt={ticket.event?.name || 'Event'}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            {/* Status Badge */}
            <div className="absolute top-3 right-3">
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                ticket.status === 'valid' && !isPast
                  ? 'bg-green-100 text-green-800 border border-green-200'
                  : isPast
                  ? 'bg-gray-100 text-gray-800 border border-gray-200'
                  : 'bg-red-100 text-red-800 border border-red-200'
              }`}>
                {isPast ? 'Past Event' : ticket.status === 'valid' ? 'Valid' : ticket.status}
              </span>
            </div>
            {/* Event Title Overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <h3 className="text-white font-bold text-lg leading-tight">
                {ticket.event?.name || 'Event'}
              </h3>
            </div>
          </div>
        )}

        {/* Event Details */}
        <div className="p-4">
          {/* If no image, show title here */}
          {!displayImage && (
            <h3 className="font-bold text-lg text-gray-900 mb-2">
              {ticket.event?.name || 'Event'}
            </h3>
          )}

          {/* Date and Location */}
          <div className="space-y-2 mb-3">
            <div className="flex items-center text-gray-600">
              <Calendar className="w-4 h-4 mr-2 flex-shrink-0" />
              <span className="text-sm">
                {ticket.event?.eventDate ? new Date(ticket.event.eventDate).toLocaleDateString('en-US', {
                  weekday: 'short',
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                }) : 'Date TBA'}
              </span>
            </div>
            <div className="flex items-center text-gray-600">
              <MapPin className="w-4 h-4 mr-2 flex-shrink-0" />
              <span className="text-sm truncate">
                {ticket.event?.location || 'Location TBA'}
              </span>
            </div>
          </div>

          {/* Purchase Info */}
          <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
            <span>
              Purchased: {new Date(ticket.purchasedAt).toLocaleDateString()}
            </span>
            <ExternalLink className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
      </div>
    </Link>
  );
};

// Refunded Ticket Card Component
const RefundedTicketCard = ({ ticket }: { ticket: any }) => {
  const imageUrl = useStorageUrl(ticket.event?.imageStorageId);
  const thumbnailUrl = useStorageUrl(ticket.event?.thumbnailImageStorageId);
  const displayImage = thumbnailUrl || imageUrl;
  
  const isEventDeleted = !ticket.event;
  const isRefunded = ticket.status === 'refunded';
  const isCancelled = ticket.status === 'cancelled';
  
  return (
    <div className={`bg-white rounded-xl shadow-lg border overflow-hidden ${
      isEventDeleted ? 'border-red-200' : 
      isRefunded ? 'border-orange-200' : 
      'border-gray-200'
    }`}>
      {/* Event Image */}
      {displayImage && (
        <div className="relative h-48 w-full">
          <Image
            src={displayImage}
            alt={ticket.event?.name || 'Event No Longer Available'}
            fill
            className="object-cover opacity-60"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
          {/* Status Badge */}
          <div className="absolute top-3 right-3">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              isRefunded ? 'bg-orange-100 text-orange-800 border border-orange-200' : 
              isCancelled ? 'bg-red-100 text-red-800 border border-red-200' : 
              'bg-gray-100 text-gray-800 border border-gray-200'
            }`}>
              {ticket.status}
            </span>
          </div>
          {/* Event Title Overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <h3 className="text-white font-bold text-lg leading-tight">
              {ticket.event?.name || 'Event No Longer Available'}
            </h3>
          </div>
        </div>
      )}

      {/* Event Details */}
      <div className="p-4">
        {/* If no image, show title here */}
        {!displayImage && (
          <h3 className="font-bold text-lg text-gray-900 mb-2">
            {ticket.event?.name || 'Event No Longer Available'}
          </h3>
        )}

        {/* Date and Location */}
        <div className="space-y-2 mb-3">
          <div className="flex items-center text-gray-600">
            <Calendar className="w-4 h-4 mr-2 flex-shrink-0" />
            <span className="text-sm">
              {ticket.event?.eventDate ? new Date(ticket.event.eventDate).toLocaleDateString() : 'Date was not available'}
            </span>
          </div>
          <div className="flex items-center text-gray-600">
            <MapPin className="w-4 h-4 mr-2 flex-shrink-0" />
            <span className="text-sm">
              {ticket.event?.location || 'Location was not available'}
            </span>
          </div>
        </div>

        {/* Status Messages */}
        {isEventDeleted && (
          <div className="mt-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
            {isRefunded ? (
              <>
                <p className="text-orange-700 text-xs font-medium flex items-center">
                  ✅ Event was cancelled by the organizer
                </p>
                <p className="text-orange-600 text-xs mt-1">
                  Your payment has been successfully refunded
                </p>
              </>
            ) : (
              <p className="text-red-700 text-xs font-medium flex items-center">
                ⚠️ This event has been cancelled or removed by the organizer
              </p>
            )}
          </div>
        )}
        {!isEventDeleted && isRefunded && (
          <div className="mt-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
            <p className="text-orange-700 text-xs font-medium flex items-center">
              💰 This ticket has been refunded
            </p>
          </div>
        )}

        {/* Purchase Info */}
        {ticket.purchasedAt && (
          <div className="text-xs text-gray-500 pt-2 border-t border-gray-100 mt-3">
            Purchased: {new Date(ticket.purchasedAt).toLocaleDateString()}
          </div>
        )}
      </div>
    </div>
  );
};

// Simple Loading Component to avoid hydration issues
const LoadingSpinner = () => (
  <div className="w-16 h-16 mx-auto mb-4 relative">
    <div className="w-16 h-16 border-4 border-gray-200 rounded-full"></div>
    <div className="absolute top-0 left-0 w-16 h-16 border-4 border-[#F96521] border-t-transparent rounded-full animate-spin"></div>
  </div>
);

// Simple Ticket Card to avoid prop issues
const SimpleTicketCard = ({ ticket }: { ticket: any }) => (
  <div className="bg-white rounded-lg shadow-md p-6 border">
    <h3 className="text-lg font-semibold mb-2">{ticket.event?.name || 'Event'}</h3>
    <p className="text-gray-600 mb-2">{ticket.event?.location || 'Location TBA'}</p>
    <p className="text-sm text-gray-500">
      {ticket.event?.eventDate ? new Date(ticket.event.eventDate).toLocaleDateString() : 'Date TBA'}
    </p>
    <div className="mt-4">
      <span className={`px-2 py-1 rounded text-xs font-medium ${
        ticket.status === 'valid' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
      }`}>
        {ticket.status}
      </span>
    </div>
  </div>
);

export default function MyTicketsPage() {
  const { user, isSignedIn, isLoaded } = useUser();
  const [mounted, setMounted] = useState(false);
  
  // Ensure client-side mounting
  useEffect(() => {
    setMounted(true);
  }, []);

  const tickets = useQuery(
    api.events.getUserTickets, 
    mounted && user?.id ? { userId: user.id } : "skip"
  );

  // DEBUG: Also query raw tickets to see what's in the database
  const rawTickets = useQuery(
    api.tickets.getUserTicketsRaw,
    mounted && user?.id ? { userId: user.id } : "skip"
  );

  // Debug logging
  useEffect(() => {
    if (mounted && tickets !== undefined && rawTickets !== undefined) {
      console.log('🔍 TICKETS DEBUG:', {
        isLoaded,
        isSignedIn,
        mounted,
        tickets,
        rawTickets,
        user: user?.id,
        ticketsCount: tickets?.length,
        rawTicketsCount: rawTickets?.length
      });
    }
  }, [mounted, tickets, rawTickets, isLoaded, isSignedIn, user?.id]);

  // Always render consistent structure to avoid hydration mismatch
  if (!mounted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
        <LoadingSpinner />
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Loading...</h1>
        <p className="text-gray-600">Please wait while we load your tickets.</p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
        <LoadingSpinner />
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Checking authentication...</h1>
        <p className="text-gray-600">Please wait while we verify your account.</p>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">Sign In Required</h1>
        <p className="text-lg text-gray-600 mb-8">
          You need to sign in to view your tickets.
        </p>
        <Link href="/sign-in">
          <Button size="lg" className="bg-[#F96521] hover:bg-[#e55511]">
            Sign In
          </Button>
        </Link>
      </div>
    );
  }

  if (tickets === undefined || rawTickets === undefined) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
        <LoadingSpinner />
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Loading tickets...</h1>
        <p className="text-gray-600">Fetching your ticket purchases...</p>
      </div>
    );
  }

  const validTickets = tickets.filter((t) => t.status === "valid" && t.event !== null);
  const otherTickets = tickets.filter((t) => t.status !== "valid" || t.event === null);

  const upcomingTickets = validTickets.filter(
    (t) => t.event && t.event.eventDate > Date.now()
  );
  const pastTickets = validTickets.filter(
    (t) => t.event && t.event.eventDate <= Date.now()
  );

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">My Tickets</h1>
      
      {/* DEBUG INFORMATION - Remove in production */}
      <div className="mb-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">🔍 Debug Information</h2>
        <div className="space-y-2 text-sm">
          <p><strong>User ID:</strong> {user?.id}</p>
          <p><strong>Filtered Tickets:</strong> {tickets.length}</p>
          <p><strong>Raw Tickets:</strong> {rawTickets.length}</p>
          
          {rawTickets.length > 0 && (
            <div className="mt-4">
              <h3 className="font-semibold">Raw Tickets in Database:</h3>
              <div className="max-h-40 overflow-y-auto bg-white p-2 rounded border">
                {rawTickets.map((ticket, index) => (
                  <div key={ticket._id} className="mb-2 p-2 border-b last:border-b-0">
                    <p><strong>#{index + 1}</strong></p>
                    <p>Status: {ticket.status}</p>
                    <p>Reference: {ticket.paystackReference || 'undefined'}</p>
                    <p>Created: {new Date(ticket._creationTime).toLocaleString()}</p>
                    <p>Event ID: {ticket.eventId}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {tickets.length === 0 ? (
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold mb-4">No tickets found</h2>
          <p className="text-gray-600 mb-8">
            You haven't purchased any tickets yet.
            {rawTickets.length > 0 && (
              <span className="block mt-2 text-orange-600 font-medium">
                Note: {rawTickets.length} ticket(s) found in database but filtered out. Check debug info above.
              </span>
            )}
          </p>
          <Link href="/discover">
            <Button className="bg-[#F96521] hover:bg-[#e55511]">
              Discover Events
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {tickets.map((ticket) => (
            <SimpleTicketCard key={ticket._id} ticket={ticket} />
          ))}
        </div>
      )}
    </div>
  );
}
