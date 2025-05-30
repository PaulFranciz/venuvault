"use client";

import React, { ReactNode, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

// Custom cache configuration by data type
const CACHE_CONFIG = {
  // Events data - moderate cache time as events don't change frequently
  event: {
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 60, // 1 hour
  },
  // Event list data - longer cache time for listings
  eventList: {
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 60 * 2, // 2 hours
  },
  // Search results - shorter cache time
  search: {
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  },
  // Ticket availability - very short cache to maintain accuracy
  ticketAvailability: {
    staleTime: 1000 * 30, // 30 seconds
    gcTime: 1000 * 60 * 5, // 5 minutes
  },
  // User data - moderate cache time
  user: {
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 60, // 1 hour
  },
  // Default for other data types
  default: {
    staleTime: 1000 * 60 * 3, // 3 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
    retry: 1,
  },
};

export function QueryProvider({ children }: { children: ReactNode }) {
  // Create client in component to support React strict mode & HMR
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        ...CACHE_CONFIG.default,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* Disable DevTools in production */}
      {process.env.NODE_ENV !== 'production' && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}
