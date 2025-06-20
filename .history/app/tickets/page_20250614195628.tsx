"use client";

import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import TicketCard from "@/components/TicketCard";
import { Ticket } from "lucide-react";
import { useEffect, useState } from "react";

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
          <div className="bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 text-gray-600">
              <Ticket className="w-5 h-5" />
              <span className="font-medium">
                {tickets.length} Total Tickets
              </span>
            </div>
          </div>
        </div>

        {upcomingTickets.length > 0 && (
          <div className="mb-12">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Upcoming Events
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {upcomingTickets.map((ticket) => (
                <TicketCard key={ticket._id} ticketId={ticket._id} ticket={ticket} />
              ))}
            </div>
          </div>
        )}

        {pastTickets.length > 0 && (
          <div className="mb-12">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Past Events
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pastTickets.map((ticket) => (
                <TicketCard key={ticket._id} ticketId={ticket._id} />
              ))}
            </div>
          </div>
        )}

        {otherTickets.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Other Tickets
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {otherTickets.map((ticket) => (
                <TicketCard key={ticket._id} ticketId={ticket._id} />
              ))}
            </div>
          </div>
        )}

        {tickets.length === 0 && (
          <div className="text-center py-12">
            <Ticket className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">
              No tickets yet
            </h3>
            <p className="text-gray-600 mt-1">
              When you purchase tickets, they&apos;ll appear here
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
