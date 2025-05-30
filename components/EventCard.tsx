"use client";

import React, { useEffect, useState, useMemo } from "react";
import { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import {
  CalendarDays,
  MapPin,
  Ticket,
  Check,
  CircleArrowRight,
  LoaderCircle,
  XCircle,
  PencilIcon,
  StarIcon,
  Clock,
} from "lucide-react";
import { useUser } from "@clerk/nextjs";
import PurchaseTicket from "./PurchaseTicket";
import { useRouter } from "next/navigation";
import { useStorageUrl } from "@/lib/utils";
import Image from "next/image";
import useTicketStore from "@/store/ticketStore";
import { useEvent, useEventAvailability, formatEventDate, formatEventTime } from "../hooks/queries/useEventQueries";
import { useQueryClient } from "@tanstack/react-query";

// Helper function outside component to avoid hook-related issues
function formatTimeRemaining(expiryTimestamp: number): string {
  const now = Date.now();
  const timeRemaining = Math.max(0, expiryTimestamp - now);
  const minutes = Math.floor(timeRemaining / (1000 * 60));
  const seconds = Math.floor((timeRemaining % (1000 * 60)) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export default function EventCard({ eventId }: { eventId: Id<"events"> }) {
  // All hooks must be called in the same order on every render
  const ticketStore = useTicketStore();
  const { user } = useUser();
  const router = useRouter();
  const queryClient = useQueryClient();
  
  // Use enhanced hooks with caching for non-user-specific data
  const { data: event, isLoading: eventLoading } = useEvent(eventId, {
    staleTime: 1000 * 60 * 5, // 5 minutes cache for event details
  });
  
  // Use enhanced hook with short cache time for availability (needs to be fresh)
  const { data: availability, isLoading: availabilityLoading } = useEventAvailability(eventId);
  
  // Continue using Convex for user-specific data
  // These queries should not be cached across different users
  const userTicket = useQuery(api.tickets.getUserTicketForEvent, {
    eventId,
    userId: user?.id ?? "",
  });
  
  const queuePosition = useQuery(api.waitingList.getQueuePosition, {
    eventId,
    userId: user?.id ?? "",
  });
  
  const imageUrl = useStorageUrl(event?.thumbnailImageStorageId);
  
  // State declarations
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  
  // Safely destructure ticketStore to avoid hook ordering issues
  const { isReserved, reservationExpiry, selectedTicketType } = ticketStore;
  
  // Effect for timer
  useEffect(() => {
    if (!reservationExpiry) return;
    
    // Set initial time
    setTimeRemaining(formatTimeRemaining(reservationExpiry));
    
    // Set up interval
    const timer = setInterval(() => {
      setTimeRemaining(formatTimeRemaining(reservationExpiry));
    }, 1000);
    
    // Clean up
    return () => clearInterval(timer);
  }, [reservationExpiry]);
  
  // Calculate display price
  const displayPrice = useMemo(() => {
    if (!event) return 0;

    if (event.isFreeEvent) return "Free";

    if (event.ticketTypes && event.ticketTypes.length > 0) {
      const visibleTypes = event.ticketTypes.filter((t) => !t.isHidden);
      if (visibleTypes.length > 0) {
        const prices = new Set(visibleTypes.map(t => t.price));
        if (prices.size === 1) {
          return visibleTypes[0].price; // e.g., "3500"
        } else {
          return "Explore all prices";
        }
      }
    }
    // Fallback if not free and no (visible) ticket types.
    // Returning 0 ensures displayPrice is always number | string.
    return 0;
  }, [event]);

  // Early return if data isn't loaded yet
  if (!event || !availability) {
    return null;
  }

  const isPastEvent = event.eventDate < Date.now();
  const isEventOwner = user?.id === event?.userId;

  const renderQueuePosition = () => {
    if (!queuePosition || queuePosition.status !== "waiting") return null;

    if (availability.purchasedCount >= availability.totalTickets) {
      return (
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <Ticket className="w-5 h-5 text-gray-400 mr-2" />
            <span className="text-gray-600 font-pally-regular">Event is sold out</span>
          </div>
        </div>
      );
    }

    if (queuePosition.position === 2) {
      return (
        <div className="flex flex-col lg:flex-row items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-100">
          <div className="flex items-center">
            <CircleArrowRight className="w-5 h-5 text-amber-500 mr-2" />
            <span className="text-amber-700 font-pally-medium">
              You&apos;re next in line! (Queue position:{" "}
              {queuePosition.position})
            </span>
          </div>
          <div className="flex items-center">
            <LoaderCircle className="w-4 h-4 mr-1 animate-spin text-amber-500" />
            <span className="text-amber-600 text-sm font-pally-regular">Waiting for ticket</span>
          </div>
        </div>
      );
    }

    return (
      <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-100">
        <div className="flex items-center">
          <LoaderCircle className="w-4 h-4 mr-2 animate-spin text-blue-500" />
          <span className="text-blue-700 font-pally-regular">Queue position</span>
        </div>
        <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-pally-medium">
          #{queuePosition.position}
        </span>
      </div>
    );
  };
  
  const renderTicketStatus = () => {
    if (!user) return null;

    if (isEventOwner) {
      return (
        <div className="mt-4">
          <button
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/seller/events/${eventId}/edit`);
            }}
            className="w-full bg-gray-100 text-gray-700 px-6 py-3 rounded-lg font-pally-medium hover:bg-gray-200 transition-colors duration-200 shadow-sm flex items-center justify-center gap-2"
          >
            <PencilIcon className="w-5 h-5" />
            Edit Event
          </button>
        </div>
      );
    }

    // Show ticket purchase status
    if (userTicket) {
      return (
        <div className="mt-4 flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-100">
          <div className="flex items-center">
            <Check className="w-5 h-5 text-green-600 mr-2" />
            <span className="text-green-700 font-pally-medium">
              You have a ticket!
            </span>
          </div>
          <button
            onClick={() => router.push(`/tickets/${userTicket._id}`)}
            className="text-sm bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-full font-pally-medium shadow-sm transition-colors duration-200 flex items-center gap-1"
          >
            View your ticket
          </button>
        </div>
      );
    }
    
    // Show reservation status if a ticket is reserved for any event
    // First we check if the reservation is for this specific event
    const isThisEventReserved = 
      // Make sure we have an active reservation
      isReserved && 
      reservationExpiry && 
      reservationExpiry > Date.now() && 
      // Check if selectedTicketType belongs to this event
      (event.ticketTypes?.some(t => t.id === selectedTicketType) || 
       // If the event doesn't have ticketTypes array with IDs matching selectedTicketType,
       // compare with eventId directly
       selectedTicketType?.includes(eventId));
      
    if (isThisEventReserved) {
      return (
        <div className="mt-4 flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-100">
          <div className="flex items-center">
            <Clock className="w-5 h-5 text-amber-600 mr-2" />
            <span className="text-amber-700 font-pally-medium">
              Ticket reserved
            </span>
          </div>
          <div className="flex items-center bg-amber-100 text-amber-700 px-3 py-1.5 rounded-full font-pally-medium">
            <span>{timeRemaining}</span>
          </div>
        </div>
      );
    }

    if (queuePosition) {
      return (
        <div className="mt-4">
          {queuePosition.status === "offered" && (
            <PurchaseTicket eventId={eventId} />
          )}
          {renderQueuePosition()}
          {queuePosition.status === "expired" && (
            <div className="p-3 bg-red-50 rounded-lg border border-red-100">
              <span className="text-red-700 font-pally-medium flex items-center">
                <XCircle className="w-5 h-5 mr-2" />
                Offer expired
              </span>
            </div>
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <div
      onClick={() => router.push(`/event/${eventId}`)}
      className={`font-pally-regular bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 cursor-pointer overflow-hidden relative w-[280px] ${
        isPastEvent ? "opacity-75 hover:opacity-100" : ""
      }`}
    >
      {/* Event Image */}
      {imageUrl && (
        <div className="relative w-full h-64">
          <Image
            src={imageUrl}
            alt={event.name}
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        </div>
      )}

      <div className={`p-3 ${imageUrl ? "relative" : ""}`}>
        <div className="flex justify-between items-start">
          <div>
            <div className="flex flex-col items-start gap-2">
              {isEventOwner && (
                <span className="inline-flex items-center gap-1 bg-blue-600/90 text-white px-2 py-1 rounded-full text-xs font-pally-medium">
                  <StarIcon className="w-3 h-3" />
                  Your Event
                </span>
              )}
              <h2 className="text-lg font-pally-bold text-gray-900">{event.name}</h2>
            </div>
            {isPastEvent && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-pally-medium bg-gray-100 text-gray-800 mt-2">
                Past Event
              </span>
            )}
          </div>
        </div>

        <div className="mt-2 space-y-1.5">
          <div className="flex items-center text-gray-600">
            <MapPin className="w-4 h-4 mr-2" />
            <span className="text-gray-600 font-pally-medium text-sm">{event.location}</span>
          </div>

          <div className="flex items-center text-gray-600">
            <CalendarDays className="w-4 h-4 mr-2" />
            <span className="font-pally-medium text-sm">
              {(() => {
                const date = new Date(event.eventDate);
                const day = date.toLocaleDateString('en-US', { weekday: 'short' });
                const dayNum = date.getDate();
                const month = date.toLocaleDateString('en-US', { month: 'long' });
                const hours = date.getHours();
                const minutes = date.getMinutes();
                const ampm = hours >= 12 ? 'PM' : 'AM';
                const formattedHours = hours % 12 || 12;
                const formattedMinutes = minutes.toString().padStart(2, '0');
                return (
                  <>
                    <span className="text-orange-500">{day}</span>
                    <span className="text-orange-500"> {dayNum} </span>
                    <span className="text-orange-500">{month}</span>
                    <span className="text-orange-500"> | </span>
                    <span className="text-orange-500">{`${formattedHours}:${formattedMinutes} ${ampm}`}</span>
                  </>
                );
              })()}{" "}
              {isPastEvent && "(Ended)"}
            </span>
          </div>

          <div className="flex items-center text-gray-600">
            <Ticket className="w-4 h-4 mr-2" />
            <span className={`text-base font-pally-semibold ${
              displayPrice === "Explore all prices" ? "text-[#141414] text-lg font-pally-bold" :
              displayPrice === "Free" ? "text-[#141414]" :
              isPastEvent ? "text-gray-500" : "text-[#141414]"
            }`}>
              {
                displayPrice === "Explore all prices"
                  ? "Explore all prices"
                  : displayPrice === "Free"
                    ? "Free"
                    : `₦${parseFloat(String(displayPrice)).toLocaleString('en-NG')}`
              }
            </span>
            {!isPastEvent && availability.activeOffers > 0 && (
              <span className="text-amber-600 text-xs font-pally-medium">
                {availability.activeOffers}{" "}
                {availability.activeOffers === 1 ? "person" : "people"} trying
                to buy
              </span>
            )}
          </div>
        </div>

        {/* Description removed as requested */}

        <div onClick={(e) => e.stopPropagation()}>
          {!isPastEvent && renderTicketStatus()}
        </div>
      </div>
    </div>
  );
}
