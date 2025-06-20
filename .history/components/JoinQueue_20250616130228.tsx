"use client";

import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { Id } from "@/convex/_generated/dataModel";
import { WAITING_LIST_STATUS } from "@/convex/constants";
import Spinner from "./Spinner";
import { Clock, OctagonXIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ConvexError } from "convex/values";

export default function JoinQueue({
  eventId,
  userId,
  ticketTypeId,
  quantity = 1
}: {
  eventId: Id<"events">;
  userId: string | undefined | null;
  ticketTypeId?: string;
  quantity?: number;
}) {
  const { toast } = useToast();
  const joinWaitingList = useMutation(api.events.joinWaitingList);

  const queuePosition = useQuery(
    api.waitingList.getQueuePosition,
    userId ? { eventId, userId } : "skip"
  );
  const userTicket = useQuery(
    api.tickets.getUserTicketForEvent,
    userId ? { eventId, userId } : "skip"
  );
  const availability = useQuery(api.events.getEventAvailability, { eventId });
  const event = useQuery(api.events.getById, { eventId });

  const isEventOwner = userId && userId === event?.userId;

  const handleJoinQueue = async () => {
    if (!userId) {
      toast({
        variant: "destructive",
        title: "Not signed in",
        description: "You must be signed in to join the queue.",
      });
      return;
    }
    
    try {
      const result = await joinWaitingList({
        eventId,
        userId,
        ticketTypeId,
        quantity
      });

      if (result.success) {
        console.log("Successfully joined waiting list");
        toast({
          title: "Joined waiting list",
          description: result.message,
        });
      }
    } catch (error) {
      if (
        error instanceof ConvexError &&
        error.message.includes("joined the waiting list too many times")
      ) {
        toast({
          variant: "destructive",
          title: "Slow down there!",
          description: error.data,
          duration: 5000,
        });
      } else {
        console.error("Error joining waiting list:", error);
        toast({
          variant: "destructive",
          title: "Uh oh! Something went wrong.",
          description: "Failed to join queue. Please try again later.",
        });
      }
    }
  };

  if (!userId) {
    return null; // Don't render anything if there's no user
  }

  if (queuePosition === undefined || availability === undefined || !event) {
    return <Spinner />;
  }

  if (userTicket) {
    return null;
  }

  const isPastEvent = event.eventDate < Date.now();
  
  // Find the specific ticket type availability if a type is selected
  let selectedTypeAvailable = true;
  if (ticketTypeId && event.ticketTypes) {
    const selectedType = event.ticketTypes.find(type => type.id === ticketTypeId);
    if (selectedType) {
      selectedTypeAvailable = selectedType.remaining >= quantity;
    }
  }

  return (
    <div>
      {(!queuePosition ||
        queuePosition.status === WAITING_LIST_STATUS.EXPIRED ||
        (queuePosition.status === WAITING_LIST_STATUS.OFFERED &&
          queuePosition.offerExpiresAt &&
          queuePosition.offerExpiresAt <= Date.now())) && (
        <>
          {isEventOwner ? (
            <div className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-gray-100 text-gray-700 rounded-lg">
              <OctagonXIcon className="w-5 h-5" />
              <span>You cannot buy a ticket for your own event</span>
            </div>
          ) : isPastEvent ? (
            <div className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-gray-100 text-gray-500 rounded-lg cursor-not-allowed">
              <Clock className="w-5 h-5" />
              <span>Event has ended</span>
            </div>
          ) : !selectedTypeAvailable ? (
            <div className="text-center p-4">
              <p className="text-lg font-semibold text-red-600">
                Selected ticket type is sold out
              </p>
            </div>
          ) : (
            <button
              id="join-queue-btn"
              onClick={handleJoinQueue}
              disabled={isPastEvent || isEventOwner || !selectedTypeAvailable}
              className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors duration-200 shadow-md flex items-center justify-center disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {quantity > 1 
                ? `Buy ${quantity} Tickets (₦${(event.ticketTypes?.find(t => t.id === ticketTypeId)?.price || event.price) * quantity})`
                : "Buy Ticket"
              }
            </button>
          )}
        </>
      )}
      
      {queuePosition && queuePosition.status === WAITING_LIST_STATUS.WAITING && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
          <p className="text-amber-800 font-medium">You're in line!</p>
          <p className="text-sm text-amber-700 mt-1">
            Position {queuePosition.position} in queue - we'll notify you when your ticket is ready
          </p>
        </div>
      )}
    </div>
  );
}
