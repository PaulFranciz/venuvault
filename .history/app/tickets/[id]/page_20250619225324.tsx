"use client";

import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { redirect, useParams } from "next/navigation";
import Ticket from "@/components/Ticket";
import Link from "next/link";
import { ArrowLeft, Download, Share2 } from "lucide-react";
import { useEffect } from "react";

export default function TicketPage() {
  const params = useParams();
  const { user } = useUser();
  const ticket = useQuery(api.tickets.getTicketWithDetails, {
    ticketId: params.id as Id<"tickets">,
  });

  useEffect(() => {
    if (!user) {
      redirect("/");
    }

    if (ticket && ticket.userId !== user.id) {
      redirect("/tickets");
    }
  }, [user, ticket]);

  // Show loading state while ticket is being fetched
  if (ticket === undefined) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your ticket...</p>
          </div>
        </div>
      </div>
    );
  }

  // Handle case where ticket doesn't exist
  if (ticket === null) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Ticket Not Found</h1>
            <p className="text-gray-600 mb-6">The ticket you're looking for doesn't exist or has been removed.</p>
            <Link
              href="/tickets"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to My Tickets
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8 space-y-8">
          {/* Navigation and Actions */}
          <div className="flex items-center justify-between">
            <Link
              href="/tickets"
              className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to My Tickets
            </Link>
            <div className="flex items-center gap-4">
              <button className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors rounded-lg hover:bg-gray-100">
                <Download className="w-4 h-4" />
                <span className="text-sm">Save</span>
              </button>
              <button className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors rounded-lg hover:bg-gray-100">
                <Share2 className="w-4 h-4" />
                <span className="text-sm">Share</span>
              </button>
            </div>
          </div>

                  {/* Event Info Summary */}
        <div
          className={`bg-white p-6 rounded-lg shadow-sm border ${
            !ticket.event 
              ? "border-orange-200" 
              : ticket.event.is_cancelled 
                ? "border-red-200" 
                : "border-gray-100"
          }`}
        >
          <h1 className="text-2xl font-bold text-gray-900">
            {ticket.event?.name || "Event No Longer Available"}
          </h1>
          <p className="mt-1 text-gray-600">
            {ticket.event 
              ? `${new Date(ticket.event.eventDate).toLocaleDateString()} at ${ticket.event.location}`
              : "Event details are no longer available"
            }
          </p>
          <div className="mt-4 flex items-center gap-4">
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                !ticket.event
                  ? "bg-orange-50 text-orange-700"
                  : ticket.event.is_cancelled
                    ? "bg-red-50 text-red-700"
                    : "bg-green-50 text-green-700"
              }`}
            >
              {!ticket.event 
                ? (ticket.status === 'refunded' ? 'Refunded' : 'Event Removed')
                : ticket.event.is_cancelled 
                  ? "Cancelled" 
                  : "Valid Ticket"
              }
            </span>
            <span className="text-sm text-gray-500">
              Purchased on {new Date(ticket.purchasedAt).toLocaleDateString()}
            </span>
          </div>
          {!ticket.event && (
            <p className="mt-4 text-sm text-orange-600">
              {ticket.status === 'refunded' 
                ? "This event was cancelled and your payment has been refunded."
                : "This event is no longer available. Contact support if you need assistance."
              }
            </p>
          )}
          {ticket.event?.is_cancelled && (
            <p className="mt-4 text-sm text-red-600">
              This event has been cancelled. A refund will be processed if it
              hasn&apos;t been already.
            </p>
          )}
        </div>
        </div>

        {/* Ticket Component */}
        <Ticket ticketId={ticket._id} />

        {/* Additional Information */}
        <div
          className={`mt-8 rounded-lg p-4 ${
            ticket.event.is_cancelled
              ? "bg-red-50 border-red-100 border"
              : "bg-blue-50 border-blue-100 border"
          }`}
        >
          <h3
            className={`text-sm font-medium ${
              ticket.event.is_cancelled ? "text-red-900" : "text-blue-900"
            }`}
          >
            Need Help?
          </h3>
          <p
            className={`mt-1 text-sm ${
              ticket.event.is_cancelled ? "text-red-700" : "text-blue-700"
            }`}
          >
            {ticket.event.is_cancelled
              ? "For questions about refunds or cancellations, please contact our support team at team@papareact-tickr.com"
              : "If you have any issues with your ticket, please contact our support team at team@papareact-tickr.com"}
          </p>
        </div>
      </div>
    </div>
  );
}
