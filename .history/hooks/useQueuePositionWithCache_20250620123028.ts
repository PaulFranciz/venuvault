"use client";

import { useQuery as useTanstackQuery } from '@tanstack/react-query';
import { useQuery as useConvexQuery } from 'convex/react';
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

export function useQueuePositionWithCache(eventId: string, userId: string | null) {
  // Skip queries if no valid user ID is provided
  const shouldFetch = !!userId && userId.trim() !== "";
  
  // DISABLED Convex polling to prevent server overload
  const convexQueuePosition = null;
  
  // TanStack Query for cached backup - MANUAL FETCH ONLY
  const { data: cachedQueuePosition, refetch } = useTanstackQuery({
    queryKey: ['queuePosition', eventId, userId],
    queryFn: async () => {
      if (!shouldFetch) return null;
      
      try {
        // Direct API call - the server endpoint will handle Redis caching
        const response = await fetch(`/api/queue/position?eventId=${eventId}&userId=${userId}`);
        if (!response.ok) throw new Error('Failed to fetch queue position');
        return response.json();
      } catch (err) {
        console.error('Queue position fetch failed:', err);
        return null;
      }
    },
    // Only run this query if we have a user ID
    enabled: false, // COMPLETELY DISABLED automatic fetching
    // NO automatic refetching to prevent server overload
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    // Very long cache time since we're doing manual fetches
    staleTime: 1000 * 60 * 10, // 10 minutes
    // Only retry once on failure
    retry: 1,
    retryDelay: 10000, // 10 second delay before retry
  });
  
  // Return data and manual refetch function
  return {
    data: convexQueuePosition || cachedQueuePosition,
    refetch, // Manual refresh function
    isStale: false, // We'll manage staleness manually
  };
}
