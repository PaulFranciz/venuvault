"use client";

import { useQuery as useTanstackQuery } from '@tanstack/react-query';
import { useQuery as useConvexQuery } from 'convex/react';
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

export function useEventWithCache(eventId: string) {
  // 1. Use Convex for real-time updates (primary data source)
  const convexEvent = useConvexQuery(api.events.getById, {
    eventId: eventId as Id<"events">,
  });
  
  // 2. Use TanStack Query with fetch API for backup/performance enhancer
  const { data: cachedEvent, error } = useTanstackQuery({
    queryKey: ['event', eventId],
    queryFn: async () => {
      try {
        // Using server action indirectly through fetch API
        const res = await fetch(`/api/events/${eventId}`);
        if (!res.ok) throw new Error('Failed to fetch event');
        return await res.json();
      } catch (err) {
        console.error('Cache fetch failed:', err);
        // Return null on cache failure, we'll use Convex data
        return null;
      }
    },
    // Moderate stale time for event data
    staleTime: 1000 * 60 * 5, // 5 minutes 
    // Don't refetch frequently since Convex provides real-time updates
    refetchInterval: 1000 * 60 * 5, // 5 minutes
  });
  
  // Combine data sources - prefer Convex for freshness, fall back to cache for resilience
  const event = convexEvent || cachedEvent;
  
  return {
    event,
    isLoading: convexEvent === undefined && cachedEvent === undefined,
    error
  };
}
