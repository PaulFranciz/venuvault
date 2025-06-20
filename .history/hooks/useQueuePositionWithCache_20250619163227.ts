"use client";

import { useQuery as useTanstackQuery } from '@tanstack/react-query';
import { useQuery as useConvexQuery } from 'convex/react';
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

export function useQueuePositionWithCache(eventId: string, userId: string) {
  // Skip queries if no user ID is provided
  const shouldFetch = !!userId;
  
  // Convex for real-time data
  const convexQueuePosition = useConvexQuery(
    api.waitingList.getQueuePosition, 
    shouldFetch ? {
      eventId: eventId as Id<"events">,
      userId: userId,
    } : "skip"
  );
  
  // TanStack Query for cached backup with reduced polling
  const { data: cachedQueuePosition } = useTanstackQuery({
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
    enabled: shouldFetch,
    // Queue position should be relatively fresh but not too aggressive
    staleTime: 1000 * 60, // 1 minute (increased from 30s)
    // Less frequent refetching for queue positions
    refetchInterval: 1000 * 60 * 2, // 2 minutes (reduced from 30s)
    // Don't refetch on window focus to reduce API calls
    refetchOnWindowFocus: false,
    // Retry configuration
    retry: 1,
    retryDelay: 3000,
  });
  
  // Prefer Convex for freshness, fall back to cache
  return convexQueuePosition || cachedQueuePosition;
}
