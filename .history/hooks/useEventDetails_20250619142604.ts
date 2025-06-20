import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

export const useEventDetails = (eventId: string) => {
  const event = useQuery(
    api.events.getEventDetails,
    eventId ? { eventId: eventId as Id<"events"> } : "skip"
  );

  return { event, isLoading: event === undefined };
}; 