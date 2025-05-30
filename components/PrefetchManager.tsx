"use client";

import { useEffect } from 'react';
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
  
  // Prefetch data based on current route
  useEffect(() => {
    // Don't prefetch data during SSR
    if (typeof window === 'undefined') return;
    
    // On homepage, prefetch popular events
    if (pathname === '/') {
      prefetchPopularEvents();
    }
    
    // On event detail page, prefetch related events
    if (pathname.startsWith('/event/')) {
      const eventId = pathname.split('/').pop() as string;
      if (eventId) {
        prefetchEventAvailability(eventId as Id<"events">);
      }
    }
    
    // On discover page, prefetch more events than visible
    if (pathname === '/discover') {
      prefetchAllEvents();
    }
  }, [pathname]);
  
  // Prefetch popular events for homepage
  const prefetchPopularEvents = async () => {
    queryClient.prefetchQuery({
      queryKey: ['events'],
      queryFn: async () => {
        return await convex.query(api.events.get, {});
      },
      staleTime: 1000 * 60 * 5, // 5 minutes
    });
  };
  
  // Prefetch all events for discover page
  const prefetchAllEvents = async () => {
    queryClient.prefetchQuery({
      queryKey: ['events'],
      queryFn: async () => {
        return await convex.query(api.events.get, {});
      },
      staleTime: 1000 * 60 * 5, // 5 minutes
    });
  };
  
  // Prefetch availability data for an event
  const prefetchEventAvailability = async (eventId: Id<"events">) => {
    queryClient.prefetchQuery({
      queryKey: ['eventAvailability', eventId],
      queryFn: async () => {
        return await convex.query(api.events.getEventAvailability, { eventId });
      },
      staleTime: 1000 * 30, // 30 seconds for fresh availability data
    });
  };
  
  // This component doesn't render anything
  return null;
}
