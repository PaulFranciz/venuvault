"use client";

import { useQuery as useTanstackQuery } from '@tanstack/react-query';
import { useQuery as useConvexQuery } from 'convex/react';
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

export function useUserTicketsWithCache(eventId: string, userId: string) {
  // Skip queries if no user ID is provided
  const shouldFetch = !!userId;
  
  // Convex for real-time data
  const convexUserTicket = useConvexQuery(
    api.tickets.getUserTicketForEvent, 
    shouldFetch ? {
      eventId: eventId as Id<"events">,
      userId: userId,
    } : "skip"
  );
  
  // TanStack Query for cached backup
  const { data: cachedUserTicket } = useTanstackQuery({
    queryKey: ['userTicket', eventId, userId],
    queryFn: async () => {
      if (!shouldFetch) return null;
      
      try {
        // Direct API call - no Redis dependency on client
        const response = await fetch(`/api/users/${userId}/tickets?eventId=${eventId}`);
        if (!response.ok) throw new Error('Failed to fetch user ticket');
        return response.json();
      } catch (err) {
        console.error('User ticket fetch failed:', err);
        return null;
      }
    },
    // Only run this query if we have a user ID
    enabled: shouldFetch,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
  
  // Prefer Convex for freshness, fall back to cache
  return convexUserTicket || cachedUserTicket;
}
