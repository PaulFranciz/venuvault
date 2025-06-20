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
      await Promise.allSettled([
        queryClient.prefetchQuery({
          queryKey: ['featuredEvents'],
          queryFn: async () => {
            try {
              const result = await getFeaturedEvents();
              // Ensure we always return an array
              return Array.isArray(result) ? result : [];
            } catch (error) {
              console.error('getFeaturedEvents failed:', error);
              return [];
            }
          },
          staleTime: 1000 * 60 * 5, // 5 minutes
        }),
        
        // Also prefetch popular event categories
        queryClient.prefetchQuery({
          queryKey: ['eventCategories'],
          queryFn: async () => {
            try {
              const result = await getEventCategories();
              // Ensure we always return an array
              return Array.isArray(result) ? result : [];
            } catch (error) {
              console.error('getEventCategories failed:', error);
              return [];
            }
          },
          staleTime: 1000 * 60 * 10, // 10 minutes
        })
      ]);
      
      console.log('Successfully preloaded events data');
    } catch (error) {
      console.error('Error preloading events data:', error);
    }
  }, [queryClient]);
  
  /**
   * Preloads popular events data
   */
  const preloadPopularEvents = useCallback(async () => {
    try {
      await queryClient.prefetchQuery({
        queryKey: ['popularEvents'],
        queryFn: async () => {
          try {
            const result = await getPopularEvents();
            return Array.isArray(result) ? result : [];
          } catch (error) {
            console.error('getPopularEvents failed:', error);
            return [];
          }
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
      });
    } catch (error) {
      console.error('Error preloading popular events data:', error);
    }
  }, [queryClient]);
  
  /**
   * Preloads trending events
   */
  const preloadTrending = useCallback(async () => {
    try {
      await queryClient.prefetchQuery({
        queryKey: ['trendingEvents'],
        queryFn: async () => {
          try {
            const result = await getTrendingEvents();
            return Array.isArray(result) ? result : [];
          } catch (error) {
            console.error('getTrendingEvents failed:', error);
            return [];
          }
        },
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
      const prefetchPromises = commonSearches.map(term =>
        queryClient.prefetchQuery({
          queryKey: ['search', term],
          queryFn: async () => {
            try {
              const result = await getSearchResults(term);
              return Array.isArray(result) ? result : [];
            } catch (error) {
              console.error(`getSearchResults failed for term "${term}":`, error);
              return [];
            }
          },
          staleTime: 1000 * 60 * 10, // 10 minutes
        })
      );
      
      await Promise.allSettled(prefetchPromises);
    } catch (error) {
      console.error('Error preloading search results:', error);
    }
  }, [queryClient]);
  
  /**
   * Preloads specific event details by ID
   */
  const preloadEventDetails = useCallback(async (eventId: string) => {
    try {
      await queryClient.prefetchQuery({
        queryKey: ['event', eventId],
        queryFn: async () => {
          try {
            const result = await getEventDetails(eventId);
            return result; // Can be null for non-existent events
          } catch (error) {
            console.error(`getEventDetails failed for event "${eventId}":`, error);
            return null;
          }
        },
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
    preloadPopularEvents,
    preloadTrending,
    preloadCommonSearches,
    preloadEventDetails,
    registerRoutePreload
  };
}
