"use client";

import { useQuery as useTanstackQuery } from '@tanstack/react-query';
import { useQuery as useConvexQuery } from 'convex/react';
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

export function useEventAvailabilityWithCache(eventId: string) {
  // Convex for real-time data
  const convexAvailability = useConvexQuery(api.events.getEventAvailability, {
    eventId: eventId as Id<"events">,
  });
  
  // TanStack Query for cached backup with reduced polling
  const { data: cachedAvailability } = useTanstackQuery({
    queryKey: ['availability', eventId],
    queryFn: async () => {
      try {
        // Direct API call instead of Redis
        const response = await fetch(`/api/events/${eventId}/availability`);
        if (!response.ok) throw new Error('Failed to fetch availability');
        return response.json();
      } catch (err) {
        console.error('Availability fetch failed:', err);
        return null;
      }
    },
    // Increased cache time for availability data
    staleTime: 1000 * 60 * 2,  // 2 minutes (increased from 30s)
    // Less frequent refetching for availability
    refetchInterval: 1000 * 60 * 5,  // 5 minutes (reduced from 1 minute)
    // Don't refetch on window focus to reduce API calls
    refetchOnWindowFocus: false,
    // Retry configuration
    retry: 1,
    retryDelay: 2000,
  });
  
  // Prefer Convex for freshness, fall back to cache
  return convexAvailability || cachedAvailability;
}
