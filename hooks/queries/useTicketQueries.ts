"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/convex/_generated/api";
import { useConvex } from "convex/react";
import { Id } from "@/convex/_generated/dataModel";

type TicketQueryOptions = {
  staleTime?: number;
  enabled?: boolean;
};

/**
 * Hook to fetch user's tickets with optimized caching
 */
export function useUserTickets(userId: string | null | undefined, options: TicketQueryOptions = {}) {
  const convex = useConvex();
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ['userTickets', userId],
    queryFn: async () => {
      if (!userId) return [];
      return await convex.query(api.events.getUserTickets, { userId });
    },
    staleTime: options.staleTime || 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 60, // 1 hour
    enabled: !!userId && (options.enabled !== false),
  });
}

/**
 * Hook to fetch user's waiting list entries with optimized caching
 */
export function useUserWaitingList(userId: string | null | undefined, options: TicketQueryOptions = {}) {
  const convex = useConvex();
  
  return useQuery({
    queryKey: ['userWaitingList', userId],
    queryFn: async () => {
      if (!userId) return [];
      return await convex.query(api.events.getUserWaitingList, { userId });
    },
    staleTime: options.staleTime || 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
    enabled: !!userId && (options.enabled !== false),
  });
}

/**
 * Hook to handle joining a waiting list with optimistic updates
 */
export function useJoinWaitingList() {
  const convex = useConvex();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      eventId,
      userId,
      ticketTypeId,
      quantity = 1
    }: {
      eventId: Id<"events">;
      userId: string;
      ticketTypeId: string;
      quantity?: number;
    }) => {
      return await convex.mutation(api.events.joinWaitingList, {
        eventId,
        userId,
        ticketTypeId,
        quantity
      });
    },
    // When a mutation is successful, invalidate relevant queries
    onSuccess: (_, variables) => {
      const { eventId, userId } = variables;
      
      // Invalidate and refetch event availability
      queryClient.invalidateQueries({ queryKey: ['eventAvailability', eventId] });
      
      // Invalidate and refetch user's waiting list
      queryClient.invalidateQueries({ queryKey: ['userWaitingList', userId] });
    },
    // Implement retry logic for failed operations
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
  });
}

/**
 * Hook to handle ticket purchases with optimistic updates
 */
export function usePurchaseTicket() {
  const convex = useConvex();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      eventId,
      userId,
      waitingListId,
      paymentInfo
    }: {
      eventId: Id<"events">;
      userId: string;
      waitingListId: Id<"waitingList">;
      paymentInfo: any;
    }) => {
      return await convex.mutation(api.events.purchaseTicket, {
        eventId,
        userId,
        waitingListId,
        paymentInfo
      });
    },
    // When a mutation starts, update UI optimistically
    onMutate: async (variables) => {
      const { userId } = variables;
      
      // Cancel any outgoing refetches for user tickets
      await queryClient.cancelQueries({ queryKey: ['userTickets', userId] });
      
      // Return context for potential rollback
      return { userId };
    },
    // When a mutation is successful, invalidate relevant queries
    onSuccess: (_, variables) => {
      const { eventId, userId } = variables;
      
      // Invalidate and refetch event availability
      queryClient.invalidateQueries({ queryKey: ['eventAvailability', eventId] });
      
      // Invalidate and refetch user's tickets
      queryClient.invalidateQueries({ queryKey: ['userTickets', userId] });
      
      // Invalidate and refetch user's waiting list
      queryClient.invalidateQueries({ queryKey: ['userWaitingList', userId] });
    },
    // If an error occurs, roll back optimistic updates
    onError: (err, variables, context) => {
      if (context?.userId) {
        // Invalidate and refetch user's tickets to restore correct state
        queryClient.invalidateQueries({ queryKey: ['userTickets', context.userId] });
      }
    },
    // Implement retry logic for failed purchases
    retry: 1,
  });
}
