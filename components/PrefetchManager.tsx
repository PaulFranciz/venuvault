"use client";

import { useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useConvex } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';

/**
 * PrefetchManager proactively loads data the user is likely to need next.
 * It observes user navigation patterns and prefetches relevant data.
 */
export default function PrefetchManager() {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const convex = useConvex();

  const prefetchPopularEvents = useCallback(async () => {
    queryClient.prefetchQuery({
      queryKey: ['events'], // Consistent key for popular/all events
      queryFn: async () => {
        // Assuming api.events.get fetches popular or all based on params or a default
        return await convex.query(api.events.get, { /* appropriate params if needed */ });
      },
      staleTime: 1000 * 60 * 5, // 5 minutes
    });
  }, [queryClient, convex]);

  const prefetchAllEvents = useCallback(async () => {
    queryClient.prefetchQuery({
      queryKey: ['events'], // Consistent key for popular/all events
      queryFn: async () => {
        return await convex.query(api.events.get, { /* appropriate params if needed */ });
      },
      staleTime: 1000 * 60 * 5, // 5 minutes
    });
  }, [queryClient, convex]);

  const prefetchEventAvailability = useCallback(async (eventId: Id<"events">) => {
    queryClient.prefetchQuery({
      queryKey: ['eventAvailability', eventId],
      queryFn: async () => {
        // Ensure this API endpoint exists and is correctly referenced
        return await convex.query(api.events.getEventAvailability, { eventId });
      },
      staleTime: 1000 * 60 * 1, // 1 minute, was 30s, adjusted for consistency
    });
  }, [queryClient, convex]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (pathname === '/') {
      prefetchPopularEvents();
    }

    if (pathname.startsWith('/event/')) {
      const eventId = pathname.split('/').pop();
      if (eventId) {
        prefetchEventAvailability(eventId as Id<"events">);
      }
    }

    if (pathname === '/discover') {
      prefetchAllEvents();
    }
  }, [pathname, prefetchPopularEvents, prefetchAllEvents, prefetchEventAvailability]);
  
  // This component doesn't render anything
  return null;
}
