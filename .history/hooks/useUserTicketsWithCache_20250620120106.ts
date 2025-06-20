"use client";

import { useQuery as useTanstackQuery } from '@tanstack/react-query';
import { useQuery as useConvexQuery } from 'convex/react';
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

export function useUserTicketsWithCache(eventId: string, userId: string | null) {
  // Skip queries if no valid user ID is provided
  const shouldFetch = !!userId && userId.trim() !== "" && !!eventId && eventId.trim() !== "";
  
  // Convex for real-time data - Use the optimized version with filtering
  const convexUserTicket = useConvexQuery(
    api.tickets.getUserTicketForEventOptimized, 
    shouldFetch ? {
      eventId: eventId as Id<"events">,
      userId: userId!,
    } : "skip"
  );
  
  // TanStack Query for cached backup
  const { data: cachedUserTicket, isLoading: cacheLoading } = useTanstackQuery({
    queryKey: ['userTicket', eventId, userId],
    queryFn: async () => {
      if (!shouldFetch) return null;
      
      try {
        // Direct API call - no Redis dependency on client
        const response = await fetch(`/api/users/${userId}/tickets?eventId=${eventId}`);
        if (!response.ok) {
          if (response.status === 404) {
            return null; // No ticket found
          }
          throw new Error(`Failed to fetch user ticket: ${response.status}`);
        }
        const data = await response.json();
        return data || null;
      } catch (err) {
        console.error('User ticket fetch failed:', err);
        return null;
      }
    },
    // Only run this query if we have a user ID and event ID
    enabled: shouldFetch,
    // REDUCED cache time to prevent phantom tickets from persisting
    staleTime: 1000 * 30, // 30 seconds instead of 5 minutes
    gcTime: 1000 * 60 * 2, // 2 minutes garbage collection
    // Force refetch on window focus to catch updates
    refetchOnWindowFocus: true,
    // Refetch when the user comes back online
    refetchOnReconnect: true,
    // Retry once on failure
    retry: 1,
    retryDelay: 3000,
  });
  
  // Determine loading state
  const isConvexLoading = convexUserTicket === undefined && shouldFetch;
  const isLoading = isConvexLoading && cacheLoading;
  
  // Prefer Convex for freshness, fall back to cache
  const userTicket = convexUserTicket || cachedUserTicket;
  
  return {
    data: userTicket,
    isLoading,
    // Additional debugging info
    debug: {
      convexUserTicket: !!convexUserTicket,
      cachedUserTicket: !!cachedUserTicket,
      shouldFetch,
      userId,
      eventId
    }
  };
}
