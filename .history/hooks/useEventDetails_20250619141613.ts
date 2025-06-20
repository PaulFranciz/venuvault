import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

export const useEventDetails = (eventId: string) => {
  const { data: event, isLoading } = useQuery(
    api.events.getEventDetails,
    { eventId: eventId as Id<"events"> }
  );

  return { event, isLoading };
}; 