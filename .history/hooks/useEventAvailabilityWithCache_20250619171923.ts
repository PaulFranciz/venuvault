"use client";

import { useQuery as useTanstackQuery } from '@tanstack/react-query';
import { useQuery as useConvexQuery } from 'convex/react';
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

export function useEventAvailabilityWithCache(eventId: string) {
  // Skip queries if no event ID is provided
  const shouldFetch = !!eventId;
  
  // Convex for real-time data
  const convexAvailability = useConvexQuery(
    api.events.getEventAvailability, 
    shouldFetch ? {
      eventId: eventId as Id<"events">,
    } : "skip"
  );
  
  // TanStack Query for cached backup - REDUCED polling
  const { data: cachedAvailability } = useTanstackQuery({
    queryKey: ['eventAvailability', eventId],
    queryFn: async () => {
      if (!shouldFetch) return null;
      
      try {
        // Direct API call - the server endpoint will handle Redis caching
        const response = await fetch(`/api/events/${eventId}/availability`);
        if (!response.ok) throw new Error('Failed to fetch availability');
        return response.json();
      } catch (err) {
        console.error('Availability fetch failed:', err);
        return null;
      }
    },
    // Only run this query if we have an event ID
    enabled: shouldFetch,
    // INCREASED cache time to reduce server load
    staleTime: 1000 * 60 * 2, // 2 minutes (was 30 seconds)
    // REDUCED refetching frequency
    refetchInterval: 1000 * 60 * 3, // 3 minutes (was 30 seconds)
    refetchOnWindowFocus: false, // Don't refetch on focus
    refetchOnMount: false, // Don't refetch on component mount
    // Only retry once on failure
    retry: 1,
    retryDelay: 3000,
  });
  
  // Prefer Convex for freshness, fall back to cache
  return convexAvailability || cachedAvailability;
}
