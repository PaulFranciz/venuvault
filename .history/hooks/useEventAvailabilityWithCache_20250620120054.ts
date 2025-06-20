"use client";

import { useQuery as useTanstackQuery } from '@tanstack/react-query';
import { useQuery as useConvexQuery } from 'convex/react';
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

export function useEventAvailabilityWithCache(eventId: string) {
  // Skip queries if no event ID is provided
  const shouldFetch = !!eventId && eventId.trim() !== "";
  
  // Use Convex for real-time availability data (re-enabled with reasonable polling)
  const convexAvailability = useConvexQuery(
    api.events.getEventAvailability,
    shouldFetch ? {
      eventId: eventId as Id<"events">,
    } : "skip"
  );
  
  // TanStack Query for cached backup
  const { data: cachedAvailability, refetch, isLoading: cacheLoading } = useTanstackQuery({
    queryKey: ['eventAvailability', eventId],
    queryFn: async () => {
      if (!shouldFetch) return null;
      
      try {
        // Direct API call - the server endpoint will handle Redis caching
        const response = await fetch(`/api/events/${eventId}/availability`);
        if (!response.ok) {
          if (response.status === 404) {
            return null; // Event not found
          }
          throw new Error(`Failed to fetch availability: ${response.status}`);
        }
        const data = await response.json();
        return data || null;
      } catch (err) {
        console.error('Availability fetch failed:', err);
        // Return default availability structure to prevent errors
        return {
          isSoldOut: false,
          totalTickets: 0,
          purchasedCount: 0,
          activeOffers: 0,
          remainingTickets: 0,
          isDefaultData: true
        };
      }
    },
    // Only run this query if we have an event ID
    enabled: shouldFetch,
    // Cache time for availability
    staleTime: 1000 * 60 * 2, // 2 minutes
    // Retry once on failure
    retry: 1,
    retryDelay: 5000,
    // Don't auto-refetch to prevent overload
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });
  
  // Determine loading state
  const isConvexLoading = convexAvailability === undefined && shouldFetch;
  const isLoading = isConvexLoading && cacheLoading;
  
  // Combine data sources - prefer Convex for freshness, fall back to cache
  const availability = convexAvailability || cachedAvailability;
  
  // Return data and manual refetch function
  return {
    data: availability,
    refetch, // Manual refresh function
    isLoading,
    isStale: false, // We'll manage staleness manually
    // Additional debugging info
    debug: {
      convexAvailability: !!convexAvailability,
      cachedAvailability: !!cachedAvailability,
      shouldFetch,
      eventId
    }
  };
}
