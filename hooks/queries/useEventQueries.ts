"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/convex/_generated/api";
import { useConvex } from "convex/react";
import { Id } from "@/convex/_generated/dataModel";
import dayjs from "dayjs";

type EventQueryOptions = {
  staleTime?: number;
  enabled?: boolean;
};

/**
 * Hook to fetch an event by ID with caching
 */
export function useEvent(eventId: Id<"events"> | string | null | undefined, options: EventQueryOptions = {}) {
  const convex = useConvex();
  
  return useQuery({
    queryKey: ['event', eventId],
    queryFn: async () => {
      if (!eventId) return null;
      // Convert string ID to Convex ID if needed
      const id = typeof eventId === 'string' ? (eventId as Id<"events">) : eventId;
      return await convex.query(api.events.getById, { eventId: id });
    },
    staleTime: options.staleTime || 1000 * 60 * 5, // 5 minutes by default
    gcTime: 1000 * 60 * 60, // 1 hour
    enabled: !!eventId && (options.enabled !== false),
  });
}

/**
 * Hook to fetch all events with caching
 */
export function useEvents(options: EventQueryOptions = {}) {
  const convex = useConvex();
  
  return useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      return await convex.query(api.events.get, {});
    },
    staleTime: options.staleTime || 1000 * 60 * 5, // 5 minutes by default
    gcTime: 1000 * 60 * 60 * 2, // 2 hours
    enabled: options.enabled !== false,
  });
}

/**
 * Hook to fetch event availability with short cache time for freshness
 */
export function useEventAvailability(eventId: Id<"events"> | string | null | undefined) {
  const convex = useConvex();
  
  return useQuery({
    queryKey: ['eventAvailability', eventId],
    queryFn: async () => {
      if (!eventId) return null;
      // Convert string ID to Convex ID if needed
      const id = typeof eventId === 'string' ? (eventId as Id<"events">) : eventId;
      return await convex.query(api.events.getEventAvailability, { eventId: id });
    },
    staleTime: 1000 * 30, // 30 seconds (very fresh data)
    gcTime: 1000 * 60 * 5, // 5 minutes
    enabled: !!eventId,
    refetchInterval: 1000 * 30, // Refetch every 30 seconds while component is mounted
  });
}

/**
 * Format event date with dayjs for consistent display
 */
export function formatEventDate(timestamp: number, format = 'dddd, MMMM D, YYYY') {
  return dayjs(timestamp).format(format);
}

/**
 * Format event time with dayjs for consistent display
 */
export function formatEventTime(timestamp: number, format = 'h:mm A') {
  return dayjs(timestamp).format(format);
}
