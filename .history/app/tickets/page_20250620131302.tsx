'use client';

import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

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
    <div className="mt-4 space-y-2">
      <span className={`px-2 py-1 rounded text-xs font-medium ${
        ticket.status === 'valid' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
      }`}>
        {ticket.status}
      </span>
      {ticket.paystackReference && (
        <p className="text-xs text-gray-500">
          Ref: {ticket.paystackReference}
        </p>
      )}
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

  // Debug logging - improved to show actual data
  useEffect(() => {
    if (mounted && tickets !== undefined) {
      console.log('🔍 TICKETS DEBUG:', {
        isLoaded,
        isSignedIn,
        mounted,
        user: user?.id,
        ticketsCount: tickets?.length,
        ticketsData: tickets, // Log the actual tickets data to see what's there
        allTicketsDetails: tickets?.map(t => ({
          id: t._id,
          status: t.status,
          eventName: t.event?.name,
          paystackRef: t.paystackReference,
          createdAt: t._creationTime
        }))
      });
    }
  }, [mounted, tickets, isLoaded, isSignedIn, user?.id]);

  // Check for recent purchase from localStorage
  const [recentPurchase, setRecentPurchase] = useState<any>(null);
  useEffect(() => {
    if (mounted && user?.id) {
      try {
        const stored = localStorage.getItem('ticwaka_recent_purchase');
        if (stored) {
          const purchase = JSON.parse(stored);
          // Check if purchase is recent (within last 5 minutes) and for current user
          if (purchase.userId === user.id && 
              Date.now() - purchase.timestamp < 5 * 60 * 1000) {
            setRecentPurchase(purchase);
          } else {
            // Clean up old purchase data
            localStorage.removeItem('ticwaka_recent_purchase');
          }
        }
      } catch (e) {
        console.error('Failed to check recent purchase:', e);
      }
    }
  }, [mounted, user?.id]);

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

  if (tickets === undefined) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
        <LoadingSpinner />
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Loading tickets...</h1>
        <p className="text-gray-600">Fetching your ticket purchases...</p>
        {recentPurchase && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg max-w-md">
            <p className="text-blue-800 text-sm">
              We detected a recent purchase (Ref: {recentPurchase.reference}). 
              Your ticket should appear shortly.
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">My Tickets</h1>
      
      {/* Recent Purchase Alert */}
      {recentPurchase && tickets.length === 0 && (
        <div className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h2 className="text-lg font-semibold mb-2 text-blue-800">🎫 Recent Purchase Detected</h2>
          <p className="text-blue-700 mb-2">
            We found a recent purchase with reference: <strong>{recentPurchase.reference}</strong>
          </p>
          <p className="text-blue-600 text-sm">
            Your ticket is being processed and should appear within a few minutes. 
            If it doesn't appear after 10 minutes, please contact support.
          </p>
          <Button 
            onClick={() => window.location.reload()} 
            className="mt-3 bg-blue-600 hover:bg-blue-700 text-white"
            size="sm"
          >
            Refresh Page
          </Button>
        </div>
      )}
      
      {/* DEBUG INFORMATION - Enhanced */}
      <div className="mb-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">🔍 Debug Information</h2>
        <div className="space-y-2 text-sm">
          <p><strong>User ID:</strong> {user?.id}</p>
          <p><strong>Tickets Query Status:</strong> {tickets === undefined ? 'Loading' : 'Loaded'}</p>
          <p><strong>Tickets Count:</strong> {tickets?.length || 0}</p>
          <p><strong>Recent Purchase:</strong> {recentPurchase ? `Yes (${recentPurchase.reference})` : 'None'}</p>
          
          {tickets && tickets.length > 0 && (
            <div className="mt-4">
              <h3 className="font-semibold">Found Tickets:</h3>
              <div className="max-h-40 overflow-y-auto bg-white p-2 rounded border">
                {tickets.map((ticket, index) => (
                  <div key={ticket._id} className="mb-2 p-2 border-b last:border-b-0">
                    <p><strong>Ticket #{index + 1}</strong></p>
                    <p>Status: {ticket.status}</p>
                    <p>Event: {ticket.event?.name || 'Unknown Event'}</p>
                    <p>PayStack Ref: {ticket.paystackReference || 'N/A'}</p>
                    <p>Created: {new Date(ticket._creationTime).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {tickets && tickets.length === 0 && (
            <div className="mt-4 p-3 bg-orange-50 rounded border border-orange-200">
              <p className="text-orange-800 font-medium">No tickets returned from getUserTickets query</p>
              <p className="text-orange-700 text-xs mt-1">
                This could mean: (1) No tickets exist, (2) Tickets are being filtered out by status/reference checks, 
                (3) Database query issue, or (4) Recent purchase still processing
              </p>
            </div>
          )}
        </div>
      </div>
      
      {tickets.length === 0 ? (
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold mb-4">No tickets found</h2>
          <p className="text-gray-600 mb-8">
            {recentPurchase ? 
              "Your recent purchase is being processed. Please wait a few minutes and refresh the page." :
              "You haven't purchased any tickets yet."
            }
          </p>
          <p className="text-sm text-gray-500 mb-8">
            Check the debug information above and console logs for more details.
          </p>
          <div className="space-x-4">
            <Link href="/discover">
              <Button className="bg-[#F96521] hover:bg-[#e55511]">
                Discover Events
              </Button>
            </Link>
            <Button 
              variant="outline" 
              onClick={() => window.location.reload()}
            >
              Refresh Page
            </Button>
          </div>
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
