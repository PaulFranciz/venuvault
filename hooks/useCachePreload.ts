"use client";

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getFeaturedEvents, getEventCategories, getPopularEvents, getTrendingEvents, getSearchResults, getEventDetails } from '@/app/actions/cache-actions';

/**
 * Hook for aggressively preloading and caching data for fast navigation experiences
 */
export function useCachePreload() {
  const queryClient = useQueryClient();
  
  /**
   * Preloads events data for the discover page
   */
  const preloadEvents = useCallback(async () => {
    try {
      // Prefetch events for discover page into React Query cache
      queryClient.prefetchQuery({
        queryKey: ['featuredEvents'],
        queryFn: getFeaturedEvents,
        staleTime: 1000 * 60 * 5, // 5 minutes
      });
      
      // Also prefetch popular event categories
      queryClient.prefetchQuery({
        queryKey: ['eventCategories'],
        queryFn: getEventCategories,
        staleTime: 1000 * 60 * 10, // 10 minutes
      });
    } catch (error) {
      console.error('Error preloading events data:', error);
    }
  }, [queryClient]);
  
  /**
   * Preloads popular events data
   */
  const preloadPopularEvents = useCallback(async () => {
    try {
      queryClient.prefetchQuery({
        queryKey: ['popularEvents'],
        queryFn: getPopularEvents,
        staleTime: 1000 * 60 * 5, // 5 minutes
      });
    } catch (error) {
      console.error('Error preloading popular events:', error);
    }
  }, [queryClient]);
  
  /**
   * Preloads trending events
   */
  const preloadTrending = useCallback(async () => {
    try {
      queryClient.prefetchQuery({
        queryKey: ['trendingEvents'],
        queryFn: getTrendingEvents,
        staleTime: 1000 * 60 * 5, // 5 minutes
      });
    } catch (error) {
      console.error('Error preloading trending events:', error);
    }
  }, [queryClient]);
  
  /**
   * Preloads search results for common queries
   */
  const preloadCommonSearches = useCallback(async () => {
    try {
      // Array of common search terms to preload
      const commonSearches = ['concert', 'party', 'workshop', 'festival'];
      
      // Preload each common search term
      for (const term of commonSearches) {
        queryClient.prefetchQuery({
          queryKey: ['search', term],
          queryFn: () => getSearchResults(term),
          staleTime: 1000 * 60 * 10, // 10 minutes
        });
      }
    } catch (error) {
      console.error('Error preloading search results:', error);
    }
  }, [queryClient]);
  
  /**
   * Preloads specific event details by ID
   */
  const preloadEventDetails = useCallback(async (eventId: string) => {
    try {
      queryClient.prefetchQuery({
        queryKey: ['event', eventId],
        queryFn: () => getEventDetails(eventId),
        staleTime: 1000 * 60 * 5, // 5 minutes
      });
    } catch (error) {
      console.error(`Error preloading event details for ${eventId}:`, error);
    }
  }, [queryClient]);
  
  /**
   * Register a route for preloading when user hovers over a link
   */
  const registerRoutePreload = useCallback((route: string, preloadFn: () => Promise<void>) => {
    // We could implement more advanced preloading logic here
    // For now, we just return the preload function
    return preloadFn;
  }, []);
  
  return {
    preloadEvents,
    preloadEventDetails,
    registerRoutePreload
  };
}
