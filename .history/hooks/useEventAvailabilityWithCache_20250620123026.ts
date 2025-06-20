"use client";

import { useQuery as useTanstackQuery } from '@tanstack/react-query';
import { useQuery as useConvexQuery } from 'convex/react';
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

export function useEventAvailabilityWithCache(eventId: string) {
  // Skip queries if no event ID is provided
  const shouldFetch = !!eventId;
  
  // DISABLED Convex polling to prevent server overload
  const convexAvailability = null;
  
  // TanStack Query for cached backup - MANUAL FETCH ONLY
  const { data: cachedAvailability, refetch } = useTanstackQuery({
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
    // COMPLETELY DISABLED automatic fetching
    enabled: false,
    // NO automatic refetching to prevent server overload
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    // Very long cache time since we're doing manual fetches
    staleTime: 1000 * 60 * 15, // 15 minutes
    // Only retry once on failure
    retry: 1,
    retryDelay: 10000,
  });
  
  // Return data and manual refetch function
  return {
    data: convexAvailability || cachedAvailability,
    refetch, // Manual refresh function
    isStale: false, // We'll manage staleness manually
  };
}
