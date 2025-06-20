"use client";

import { useQuery as useTanstackQuery } from '@tanstack/react-query';
import { useQuery as useConvexQuery } from 'convex/react';
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

export function useQueuePositionWithCache(eventId: string, userId: string) {
  // Skip queries if no user ID is provided
  const shouldFetch = !!userId;
  
  // Convex for real-time data - DRASTICALLY reduced polling
  const convexQueuePosition = useConvexQuery(
    api.waitingList.getQueuePosition, 
    shouldFetch ? {
      eventId: eventId as Id<"events">,
      userId: userId,
    } : "skip"
  );
  
  // TanStack Query for cached backup - MUCH less aggressive polling
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
    // MUCH longer cache time to reduce server load
    staleTime: 1000 * 60 * 3, // 3 minutes (was 30 seconds)
    // DRASTICALLY reduced refetching - only when user manually refreshes
    refetchInterval: false, // Disabled automatic refetching
    refetchOnWindowFocus: false, // Don't refetch on focus
    refetchOnMount: false, // Don't refetch on component mount
    refetchOnReconnect: false, // Don't refetch on network reconnect
    // Only retry once on failure
    retry: 1,
    retryDelay: 5000, // 5 second delay before retry
  });
  
  // Prefer Convex for freshness, fall back to cache
  return convexQueuePosition || cachedQueuePosition;
}
