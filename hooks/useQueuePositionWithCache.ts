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
  
  // TanStack Query for cached backup
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
    // Queue position should be relatively fresh
    staleTime: 1000 * 30, // 30 seconds
    // More frequent refetching for queue positions
    refetchInterval: 1000 * 30, // 30 seconds
  });
  
  // Prefer Convex for freshness, fall back to cache
  return convexQueuePosition || cachedQueuePosition;
}
