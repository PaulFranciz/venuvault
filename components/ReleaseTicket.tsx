"use client";

import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { useState } from "react";
import { XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ReleaseTicket({
  eventId,
  waitingListId,
}: {
  eventId: Id<"events">;
  waitingListId: Id<"waitingList">;
}) {
  const [isReleasing, setIsReleasing] = useState(false);
  const releaseTicketMutation = useMutation(api.waitingList.releaseTicket);
  const { toast } = useToast();

  const performRelease = async () => {
    setIsReleasing(true);
    try {
      await releaseTicketMutation({
        eventId,
        waitingListId,
      });
      toast({
        title: "Success",
        description: "Ticket offer released successfully.",
        variant: "default",
      });
    } catch (error) {
      console.error("Error releasing ticket:", error); 
      toast({
        title: "Error",
        description: "Failed to release ticket. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsReleasing(false);
    }
  };

  const handleRelease = () => {
    // For now, let's just call performRelease directly without a confirmation
    // We'll add a proper confirmation dialog later if needed
    performRelease();
  };

  return (
    <button
      onClick={handleRelease}
      disabled={isReleasing}
      className="w-full flex items-center justify-center gap-2 py-3 px-6 bg-red-600 text-white font-medium rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-red-700 shadow-sm"
    >
      <XCircle className="w-5 h-5" />
      {isReleasing ? "Releasing..." : "Release Ticket"}
    </button>
  );
}
