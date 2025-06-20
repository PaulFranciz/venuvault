"use client";

import { useQuery as useTanstackQuery } from '@tanstack/react-query';
import { useQuery as useConvexQuery } from 'convex/react';
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

export function useEventWithCache(eventId: string) {
  // Skip queries if no event ID is provided
  const shouldFetch = !!eventId && eventId.trim() !== "";
  
  // 1. Use Convex for real-time updates (primary data source)
  const convexEvent = useConvexQuery(
    api.events.getById, 
    shouldFetch ? {
      eventId: eventId as Id<"events">,
    } : "skip"
  );
  
  // 2. Use TanStack Query with fetch API for backup/performance enhancer
  const { data: cachedEvent, error, isLoading: cacheLoading } = useTanstackQuery({
    queryKey: ['event', eventId],
    queryFn: async () => {
      if (!shouldFetch) return null;
      
      try {
        // Using server action indirectly through fetch API
        const res = await fetch(`/api/events/${eventId}`);
        if (!res.ok) {
          if (res.status === 404) {
            return null; // Event not found
          }
          throw new Error(`Failed to fetch event: ${res.status}`);
        }
        const data = await res.json();
        return data || null;
      } catch (err) {
        console.error('Cache fetch failed:', err);
        // Return null on cache failure, we'll use Convex data
        return null;
      }
    },
    // Only run this query if we have an event ID
    enabled: shouldFetch,
    // Moderate stale time for event data
    staleTime: 1000 * 60 * 5, // 5 minutes 
    // Don't refetch frequently since Convex provides real-time updates
    refetchInterval: false,
    refetchOnWindowFocus: false,
    // Retry once on failure
    retry: 1,
    retryDelay: 5000,
  });
  
  // Determine loading state
  const isConvexLoading = convexEvent === undefined && shouldFetch;
  const isLoading = isConvexLoading && cacheLoading;
  
  // Combine data sources - prefer Convex for freshness, fall back to cache for resilience
  const event = convexEvent || cachedEvent;
  
  return {
    event,
    isLoading,
    error,
    // Additional debugging info
    debug: {
      convexEvent: !!convexEvent,
      cachedEvent: !!cachedEvent,
      shouldFetch,
      eventId
    }
  };
}
