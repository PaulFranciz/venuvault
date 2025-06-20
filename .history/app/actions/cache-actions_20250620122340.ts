"use server";

import { redisKeys, REDIS_TTL } from '@/lib/redis';
import { withCache, invalidateCache as cacheInvalidate } from '@/lib/cache';
import { Id } from '@/convex/_generated/dataModel';

// Import Convex client
import { ConvexHttpClient } from "convex/browser";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL || '');

// Server action for fetching events with caching
export async function getFeaturedEvents() {
  try {
    return await withCache(
      'events:featured:list',
      async () => {
        try {
          // Use correct Convex query path
          const events = await convex.query('events:get', {});
          return events || [];
        } catch (error) {
          console.error('Failed to fetch events from Convex:', error);
          // Return empty array instead of undefined to prevent TanStack Query errors
          return [];
        }
      },
      { ttl: REDIS_TTL.EVENT_DETAILS }
    );
  } catch (error) {
    console.error('getFeaturedEvents cache error:', error);
    // Always return an array to prevent undefined errors
    return [];
  }
}

// Server action for fetching event categories with caching
export async function getEventCategories() {
  try {
    return await withCache(
      'categories:list',
      async () => {
        try {
          // Try to get categories from Convex first
          const categories = await convex.query('eventDiscovery:getCategories', {});
          return categories || [
            { id: 'music', name: 'Music' },
            { id: 'sports', name: 'Sports' },
            { id: 'arts', name: 'Arts & Theater' },
            { id: 'workshops', name: 'Workshops' },
            { id: 'conferences', name: 'Conferences' }
          ];
        } catch (error) {
          console.error('Failed to fetch categories from Convex:', error);
          // Return mock categories if Convex fails
          return [
            { id: 'music', name: 'Music' },
            { id: 'sports', name: 'Sports' },
            { id: 'arts', name: 'Arts & Theater' },
            { id: 'workshops', name: 'Workshops' },
            { id: 'conferences', name: 'Conferences' }
          ];
        }
      },
      { ttl: REDIS_TTL.EVENT_DETAILS }
    );
  } catch (error) {
    console.error('getEventCategories cache error:', error);
    // Always return an array to prevent undefined errors
    return [
      { id: 'music', name: 'Music' },
      { id: 'sports', name: 'Sports' },
      { id: 'arts', name: 'Arts & Theater' },
      { id: 'workshops', name: 'Workshops' },
      { id: 'conferences', name: 'Conferences' }
    ];
  }
}

// Server action for fetching popular events with caching
export async function getPopularEvents() {
  try {
    return await withCache(
      'popular:events',
      async () => {
        try {
          const events = await convex.query('events:get', {});
          return events || [];
        } catch (error) {
          console.error('Failed to fetch popular events from Convex:', error);
          return [];
        }
      },
      { ttl: REDIS_TTL.EVENT_DETAILS }
    );
  } catch (error) {
    console.error('getPopularEvents cache error:', error);
    return [];
  }
}

// Server action for fetching trending events with caching
export async function getTrendingEvents() {
  try {
    return await withCache(
      'trending:events',
      async () => {
        try {
          const events = await convex.query('events:get', {});
          return events || [];
        } catch (error) {
          console.error('Failed to fetch trending events from Convex:', error);
          return [];
        }
      },
      { ttl: REDIS_TTL.EVENT_DETAILS }
    );
  } catch (error) {
    console.error('getTrendingEvents cache error:', error);
    return [];
  }
}

// Server action for fetching search results with caching
export async function getSearchResults(query: string) {
  try {
    return await withCache(
      `search:${query.toLowerCase().trim()}`,
      async () => {
        try {
          const results = await convex.query('events:search', { searchTerm: query });
          return results || [];
        } catch (error) {
          console.error('Failed to fetch search results from Convex:', error);
          return [];
        }
      },
      { ttl: REDIS_TTL.EVENT_DETAILS }
    );
  } catch (error) {
    console.error('getSearchResults cache error:', error);
    return [];
  }
}

// Server action for fetching event details with caching
export async function getEventDetails(eventId: string) {
  try {
    return await withCache(
      redisKeys.eventDetails(eventId),
      async () => {
        try {
          const event = await convex.query('events:getById', { eventId });
          return event || null;
        } catch (error) {
          console.error('Failed to fetch event details from Convex:', error);
          return null;
        }
      },
      { ttl: REDIS_TTL.EVENT_DETAILS }
    );
  } catch (error) {
    console.error('getEventDetails cache error:', error);
    return null;
  }
}

// Clear specific event cache
export async function invalidateEventCache(eventId: string) {
  try {
    if (eventId) {
      await cacheInvalidate(redisKeys.eventDetails(eventId));
    }
  } catch (error) {
    console.error('Failed to invalidate event cache:', error);
  }
}
