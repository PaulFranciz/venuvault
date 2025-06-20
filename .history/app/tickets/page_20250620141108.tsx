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

// Beautiful Ticket Card that looks like a real ticket
const SimpleTicketCard = ({ ticket }: { ticket: any }) => (
  <Link href={`/tickets/${ticket._id}`}>
    <div className="group relative bg-gradient-to-br from-white to-blue-50 rounded-2xl shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden">
      {/* Ticket Header with Brand Colors */}
      <div className="bg-gradient-to-r from-[#F96521] to-[#e55511] p-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <span className="text-sm font-medium uppercase tracking-wide">Ticwaka Event</span>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
            ticket.status === 'valid' 
              ? 'bg-green-500 text-white' 
              : ticket.status === 'used'
                ? 'bg-yellow-500 text-white'
                : 'bg-gray-500 text-white'
          }`}>
            {ticket.status}
          </span>
        </div>
      </div>

      {/* Main Ticket Content */}
      <div className="p-6">
        {/* Event Name */}
        <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-[#F96521] transition-colors">
          {ticket.event?.name || 'Event'}
        </h3>

        {/* Event Details Grid */}
        <div className="space-y-4">
          {/* Location */}
          <div className="flex items-start space-x-3">
            <div className="w-5 h-5 text-gray-400 mt-0.5">
              <svg fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500 uppercase tracking-wide font-medium">Location</p>
              <p className="text-gray-700 font-medium text-sm leading-relaxed">
                {ticket.event?.location || 'Location TBA'}
              </p>
            </div>
          </div>

          {/* Date */}
          <div className="flex items-center space-x-3">
            <div className="w-5 h-5 text-gray-400">
              <svg fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500 uppercase tracking-wide font-medium">Date</p>
              <p className="text-gray-900 font-bold text-lg">
                {ticket.event?.eventDate ? new Date(ticket.event.eventDate).toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: '2-digit', 
                  year: 'numeric'
                }) : 'Date TBA'}
              </p>
            </div>
          </div>
        </div>

        {/* Ticket Reference and Price */}
        <div className="mt-6 pt-4 border-t border-gray-200 flex items-center justify-between">
          <div>
            {ticket.paystackReference && (
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Reference</p>
                <p className="text-gray-700 font-mono text-sm">
                  {ticket.paystackReference}
                </p>
              </div>
            )}
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Price</p>
            <p className="text-[#F96521] font-bold text-lg">
              ₦{(ticket.amount || ticket.event?.price || 0).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Call to Action */}
        <div className="mt-6 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-5 h-5 text-blue-600">
                <svg fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm2 2V5h1v1H5zM3 13a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1v-3zm2 2v-1h1v1H5zM13 3a1 1 0 00-1 1v3a1 1 0 001 1h3a1 1 0 001-1V4a1 1 0 00-1-1h-3zm1 2v1h1V5h-1z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="text-blue-700 font-medium text-sm">View QR Code & Details</span>
            </div>
            <div className="text-blue-600">
              <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Decorative ticket perforation effect */}
      <div className="absolute left-0 top-20 w-4 h-4 bg-gray-50 rounded-full transform -translate-x-2"></div>
      <div className="absolute right-0 top-20 w-4 h-4 bg-gray-50 rounded-full transform translate-x-2"></div>
    </div>
  </Link>
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
      

      
      {tickets.length === 0 ? (
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold mb-4">No tickets found</h2>
          <p className="text-gray-600 mb-8">
            {recentPurchase ? 
              "Your recent purchase is being processed. Please wait a few minutes and refresh the page." :
              "You haven't purchased any tickets yet."
            }
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
