"use client";

import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import TicketCard from "@/components/TicketCard";
import { Ticket, Calendar, MapPin, ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useStorageUrl } from "@/hooks/useStorageUrl";
import Image from "next/image";

export default function MyTicketsPage() {
  const { user } = useUser();
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  
  const tickets = useQuery(
    api.events.getUserTickets, 
    user?.id ? { userId: user.id } : "skip"
  );

  // Set a timeout for loading state
  useEffect(() => {
    if (user?.id && tickets === undefined) {
      const timer = setTimeout(() => {
        setLoadingTimeout(true);
      }, 10000); // 10 seconds timeout
      
      return () => clearTimeout(timer);
    }
  }, [user?.id, tickets]);

  // Debug logging
  console.log("Tickets query result:", { tickets, user: user?.id, isSignedIn: !!user });

  // Show loading state while data is being fetched
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12">
            <Ticket className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Sign in required</h3>
            <p className="text-gray-600 mb-4">Please sign in to view your tickets</p>
            <a 
              href="/sign-in" 
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Sign In
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (tickets === undefined) {
    if (loadingTimeout) {
      return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center py-12">
              <Ticket className="w-12 h-12 text-red-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Loading timeout</h3>
              <p className="text-gray-600 mb-4">Unable to load tickets. This might be a temporary issue.</p>
              <p className="text-xs text-gray-400 mb-4">User ID: {user?.id || 'Not available'}</p>
              <button 
                onClick={() => window.location.reload()} 
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                Refresh Page
              </button>
            </div>
          </div>
        </div>
      );
    }
    
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your tickets...</p>
            <p className="text-xs text-gray-400 mt-2">User ID: {user?.id || 'Not available'}</p>
          </div>
        </div>
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

  // Enhanced Ticket Card Component
  const EnhancedTicketCard = ({ ticket, isPast = false }) => {
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

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Tickets</h1>
            <p className="mt-2 text-gray-600">
              Manage and view all your tickets in one place
            </p>
          </div>
          <div className="bg-white px-6 py-3 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 text-gray-600">
              <Ticket className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-500">Total Tickets</p>
                <p className="font-bold text-lg text-gray-900">
                  {tickets.length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {upcomingTickets.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-1 h-6 bg-green-500 rounded-full"></div>
              <h2 className="text-2xl font-bold text-gray-900">
                Upcoming Events
              </h2>
              <span className="bg-green-100 text-green-800 text-sm font-medium px-2 py-1 rounded-full">
                {upcomingTickets.length}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {upcomingTickets.map((ticket) => (
                <EnhancedTicketCard key={ticket._id} ticket={ticket} />
              ))}
            </div>
          </div>
        )}

        {pastTickets.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-1 h-6 bg-gray-400 rounded-full"></div>
              <h2 className="text-2xl font-bold text-gray-900">
                Past Events
              </h2>
              <span className="bg-gray-100 text-gray-800 text-sm font-medium px-2 py-1 rounded-full">
                {pastTickets.length}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pastTickets.map((ticket) => (
                <EnhancedTicketCard key={ticket._id} ticket={ticket} isPast={true} />
              ))}
            </div>
          </div>
        )}

        {otherTickets.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-6">
              <div className="w-1 h-6 bg-red-500 rounded-full"></div>
              <h2 className="text-2xl font-bold text-gray-900">
                Refunded & Cancelled Tickets
              </h2>
              <span className="bg-red-100 text-red-800 text-sm font-medium px-2 py-1 rounded-full">
                {otherTickets.length}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {otherTickets.map((ticket) => {
                const isEventDeleted = !ticket.event;
                const isRefunded = ticket.status === 'refunded';
                const isCancelled = ticket.status === 'cancelled';
                const imageUrl = useStorageUrl(ticket.event?.imageStorageId);
                const thumbnailUrl = useStorageUrl(ticket.event?.thumbnailImageStorageId);
                const displayImage = thumbnailUrl || imageUrl;
                
                return (
                  <div key={ticket._id} className={`bg-white rounded-xl shadow-lg border overflow-hidden ${
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
              })}
            </div>
          </div>
        )}

        {tickets.length === 0 && (
          <div className="text-center py-16">
            <div className="bg-white rounded-2xl p-12 shadow-sm border border-gray-100 max-w-md mx-auto">
              <Ticket className="w-16 h-16 text-gray-300 mx-auto mb-6" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                No tickets yet
              </h3>
              <p className="text-gray-600 mb-6">
                When you purchase tickets, they'll appear here
              </p>
              <Link 
                href="/discover"
                className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors"
              >
                Discover Events
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
