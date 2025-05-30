"use client";

import { initializePaystackTransaction } from "@/app/actions/initializePaystackTransaction";
import { Id } from "@/convex/_generated/dataModel";
import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import ReleaseTicket from "./ReleaseTicket";
import { Ticket } from "lucide-react";

export default function PurchaseTicket({ eventId }: { eventId: Id<"events"> }) {
  const { user } = useUser();
  const queuePosition = useQuery(api.waitingList.getQueuePosition, {
    eventId,
    userId: user?.id ?? "",
  });

  const [timeRemaining, setTimeRemaining] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const offerExpiresAt = queuePosition?.offerExpiresAt ?? 0;
  const isExpired = Date.now() > offerExpiresAt;

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

  const handlePurchase = async () => {
    if (!user || isExpired) return;
    setError(null);
    setIsLoading(true);

    try {
      const result = await initializePaystackTransaction({
        eventId,
      });

      if (result?.authorizationUrl) {
        window.location.href = result.authorizationUrl;
      } else {
        throw new Error("Failed to initialize Paystack payment.");
      }
    } catch (err) {
      console.error("Error initializing Paystack transaction:", err);
      setError(err instanceof Error ? err.message : "Could not start payment process.");
      setIsLoading(false);
    }
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
          </div>
        </div>

        {error && (
            <p className="text-sm text-red-600 text-center">Error: {error}</p>
        )}

        <button
          onClick={handlePurchase}
          disabled={isExpired || isLoading}
          className="w-full bg-gradient-to-r from-amber-500 to-amber-600 text-white px-8 py-4 rounded-lg font-bold shadow-md hover:from-amber-600 hover:to-amber-700 transform hover:scale-[1.02] transition-all duration-200 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed disabled:hover:scale-100 text-lg"
        >
          {isLoading
            ? "Redirecting to Payment..."
            : isExpired
            ? "Offer Expired"
            : "Purchase Your Ticket Now →"}
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
