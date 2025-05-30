"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/convex/_generated/api";
import { useConvex } from "convex/react";
import { useState, useEffect } from "react";
import { Id } from "@/convex/_generated/dataModel";

export type SearchResult = {
  _id: string;
  name: string;
  location: string;
  eventDate: number;
  imageUrl?: string;
  imageStorageId?: Id<"_storage">;
  thumbnailImageStorageId?: Id<"_storage">;
};

type SearchQueryOptions = {
  staleTime?: number;
  enabled?: boolean;
  debounceMs?: number;
};

/**
 * Enhanced search hook with debouncing and caching
 */
export function useEventSearch(searchTerm: string, options: SearchQueryOptions = {}) {
  const convex = useConvex();
  const queryClient = useQueryClient();
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);
  
  // Configure debouncing to prevent excessive API calls
  const debounceMs = options.debounceMs || 300;
  
  // Debounce search term changes
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, debounceMs);
    
    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm, debounceMs]);
  
  // Track recent searches for potential prefetching
  useEffect(() => {
    if (debouncedSearchTerm.trim()) {
      // Store recent searches in session storage
      try {
        const recentSearches = JSON.parse(sessionStorage.getItem('recentSearches') || '[]');
        if (!recentSearches.includes(debouncedSearchTerm)) {
          recentSearches.unshift(debouncedSearchTerm);
          // Keep only the last 5 searches
          sessionStorage.setItem('recentSearches', JSON.stringify(recentSearches.slice(0, 5)));
        }
      } catch (error) {
        // Silently fail if session storage is not available
      }
    }
  }, [debouncedSearchTerm]);
  
  // Perform the search query with optimized caching
  const result = useQuery({
    queryKey: ['search', debouncedSearchTerm],
    queryFn: async () => {
      if (!debouncedSearchTerm.trim()) return [];
      return await convex.query(api.events.search, { searchTerm: debouncedSearchTerm });
    },
    staleTime: options.staleTime || 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    enabled: debouncedSearchTerm.trim().length > 0 && (options.enabled !== false),
  });
  
  // Return both the search results and the debounced term for UI synchronization
  return {
    ...result,
    debouncedSearchTerm,
    // Helper method to prefetch event details when a user hovers over a search result
    prefetchEventDetails: (eventId: string) => {
      if (eventId) {
        queryClient.prefetchQuery({
          queryKey: ['event', eventId],
          queryFn: async () => {
            return await convex.query(api.events.getById, { 
              eventId: eventId as Id<"events"> 
            });
          },
          staleTime: 1000 * 60 * 5, // 5 minutes
        });
      }
    }
  };
}

/**
 * Hook to get popular searches that can be prefetched
 */
export function useRecentSearches() {
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  
  useEffect(() => {
    try {
      const searches = JSON.parse(sessionStorage.getItem('recentSearches') || '[]');
      setRecentSearches(searches);
    } catch (error) {
      setRecentSearches([]);
    }
  }, []);
  
  return recentSearches;
}
