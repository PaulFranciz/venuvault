"use client";

import { Id } from "@/convex/_generated/dataModel";
import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import ReleaseTicket from "./ReleaseTicket";
import { Ticket } from "lucide-react";
import { useRouter } from "next/navigation";

export default function PurchaseTicket({ eventId }: { eventId: Id<"events"> }) {
  const { user } = useUser();
  const router = useRouter();
  const queuePosition = useQuery(api.waitingList.getQueuePosition, {
    eventId,
    userId: user?.id ?? "",
  });
  const event = useQuery(api.events.getById, { eventId });

  const [timeRemaining, setTimeRemaining] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const offerExpiresAt = queuePosition?.offerExpiresAt ?? 0;
  const isExpired = Date.now() > offerExpiresAt;

  // Get the ticket type and calculate total price
  const ticketTypeId = queuePosition?.ticketTypeId;
  const quantity = queuePosition?.quantity || 1;
  
  let ticketPrice = event?.price || 0;
  let ticketName = "General Admission";
  let isFreeEvent = event?.isFreeEvent;
  
  if (ticketTypeId && event?.ticketTypes) {
    const selectedType = event.ticketTypes.find(type => type.id === ticketTypeId);
    if (selectedType) {
      ticketPrice = selectedType.price;
      ticketName = selectedType.name;
    }
  }
  
  const totalPrice = ticketPrice * quantity;

  useEffect(() => {
    const calculateTimeRemaining = () => {
      if (isExpired) {
        setTimeRemaining("Expired");
        return;
      }

      const diff = offerExpiresAt - Date.now();
      const minutes = Math.floor(diff / 1000 / 60);
      const seconds = Math.floor((diff / 1000) % 60);

      if (minutes > 0) {
        setTimeRemaining(
          `${minutes} minute${minutes === 1 ? "" : "s"} ${seconds} second${
            seconds === 1 ? "" : "s"
          }`
        );
      } else {
        setTimeRemaining(`${seconds} second${seconds === 1 ? "" : "s"}`);
      }
    };

    if (offerExpiresAt > 0) {
        calculateTimeRemaining();
        const interval = setInterval(calculateTimeRemaining, 1000);
        return () => clearInterval(interval);
    } else {
        setTimeRemaining("--:--");
    }
  }, [offerExpiresAt, isExpired]);

  const handlePurchase = () => {
    if (!user || isExpired) return;
    router.push(`/checkout/${eventId}`);
  };

  if (!user || !queuePosition || queuePosition.status !== "offered") {
    return null;
  }

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-amber-200">
      <div className="space-y-4">
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                <Ticket className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Ticket Reserved
                </h3>
                <p className={`text-sm ${isExpired ? 'text-red-500 font-bold' : 'text-gray-500'}`}>
                  {isExpired ? "Offer Expired" : `Expires in ${timeRemaining}`}
                </p>
              </div>
            </div>

            <div className="text-sm text-gray-600 leading-relaxed">
              {isExpired 
                ? "Your offer to purchase this ticket has expired." 
                : "A ticket has been reserved for you. Complete your purchase before the timer expires to secure your spot at this event."}
            </div>
            
            {/* Display ticket details */}
            <div className="mt-3 pt-3 border-t border-gray-100">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{ticketName}</span>
                <span className="font-medium">
                  {isFreeEvent ? "Free" : `₦${ticketPrice.toFixed(2)}`}
                </span>
              </div>
              
              {quantity > 1 && (
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-gray-600">Quantity</span>
                  <span className="font-medium">{quantity}</span>
                </div>
              )}
              
              <div className="flex justify-between text-base font-bold mt-3 pt-3 border-t border-gray-100">
                <span>Total</span>
                <span className="text-blue-600">
                  {isFreeEvent ? "Free" : `₦${totalPrice.toFixed(2)}`}
                </span>
              </div>
            </div>
          </div>
        </div>

        {error && (
            <p className="text-sm text-red-600 text-center">Error: {error}</p>
        )}

        <button
          onClick={handlePurchase}
          disabled={isExpired}
          className="w-full bg-gradient-to-r from-amber-500 to-amber-600 text-white px-8 py-4 rounded-lg font-bold shadow-md hover:from-amber-600 hover:to-amber-700 transform hover:scale-[1.02] transition-all duration-200 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed disabled:hover:scale-100 text-lg"
        >
          {isExpired ? "Offer Expired" : isFreeEvent ? "Get Free Ticket →" : `Pay ₦${totalPrice.toFixed(2)} Now →`}
        </button>

        {!isExpired && (
          <div className="mt-4">
            <ReleaseTicket eventId={eventId} waitingListId={queuePosition._id} />
          </div>
        )}
      </div>
    </div>
  );
}
