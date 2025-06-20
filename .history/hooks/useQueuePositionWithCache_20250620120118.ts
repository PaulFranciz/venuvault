"use client";

import { useQuery as useTanstackQuery } from '@tanstack/react-query';
import { useQuery as useConvexQuery } from 'convex/react';
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

export function useQueuePositionWithCache(eventId: string, userId: string | null) {
  // Skip queries if no valid user ID is provided
  const shouldFetch = !!userId && userId.trim() !== "" && !!eventId && eventId.trim() !== "";
  
  // Use Convex for real-time queue position updates (re-enabled with reasonable polling)
  const convexQueuePosition = useConvexQuery(
    api.waitingList.getQueuePosition,
    shouldFetch ? {
      eventId: eventId as Id<"events">,
      userId: userId!,
    } : "skip"
  );
  
  // TanStack Query for cached backup
  const { data: cachedQueuePosition, refetch, isLoading: cacheLoading } = useTanstackQuery({
    queryKey: ['queuePosition', eventId, userId],
    queryFn: async () => {
      if (!shouldFetch) return null;
      
      try {
        // Direct API call - the server endpoint will handle Redis caching
        const response = await fetch(`/api/queue/position?eventId=${eventId}&userId=${userId}`);
        if (!response.ok) {
          if (response.status === 404) {
            return null; // No queue position found
          }
          throw new Error(`Failed to fetch queue position: ${response.status}`);
        }
        const data = await response.json();
        return data || null;
      } catch (err) {
        console.error('Queue position fetch failed:', err);
        return null;
      }
    },
    // Only run this query if we have a user ID and event ID
    enabled: shouldFetch,
    // Cache time for queue position
    staleTime: 1000 * 60 * 1, // 1 minute
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
  const isConvexLoading = convexQueuePosition === undefined && shouldFetch;
  const isLoading = isConvexLoading && cacheLoading;
  
  // Combine data sources - prefer Convex for freshness, fall back to cache
  const queuePosition = convexQueuePosition || cachedQueuePosition;
  
  // Return data and manual refetch function
  return {
    data: queuePosition,
    refetch, // Manual refresh function
    isLoading,
    isStale: false, // We'll manage staleness manually
    // Additional debugging info
    debug: {
      convexQueuePosition: !!convexQueuePosition,
      cachedQueuePosition: !!cachedQueuePosition,
      shouldFetch,
      userId,
      eventId
    }
  };
}
