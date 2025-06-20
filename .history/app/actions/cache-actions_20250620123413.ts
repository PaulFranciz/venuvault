"use server";

import { redisKeys, REDIS_TTL } from '@/lib/redis';
import { withCache, invalidateCache as cacheInvalidate } from '@/lib/cache';
import { Id } from '@/convex/_generated/dataModel';

// Import Convex client - using dynamic import to avoid bundling server code with client
const { ConvexHttpClient } = require('convex/browser');

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL || '');

// Server action for fetching events with caching
export async function getFeaturedEvents() {
  try {
    return await withCache(
      'events:featured:list',
      async () => {
        const events = await convex.query('events:get');
        return events || [];
      },
      { ttl: REDIS_TTL.EVENT_DETAILS }
    );
  } catch (error) {
    console.error('getFeaturedEvents error:', error);
    return []; // Return empty array instead of undefined
  }
}

// Server action for fetching event categories with caching
export async function getEventCategories() {
  try {
    return await withCache(
      'categories:list',
      async () => {
        // Return mock categories if actual endpoint doesn't exist
        return [
          { id: 'music', name: 'Music' },
          { id: 'sports', name: 'Sports' },
          { id: 'arts', name: 'Arts & Theater' },
          { id: 'workshops', name: 'Workshops' },
          { id: 'conferences', name: 'Conferences' }
        ];
      },
      { ttl: REDIS_TTL.EVENT_DETAILS }
    );
  } catch (error) {
    console.error('getEventCategories error:', error);
    return []; // Return empty array instead of undefined
  }
}

// Server action for fetching popular events with caching
export async function getPopularEvents() {
  try {
    return await withCache(
      'popular:events',
      async () => {
        const events = await convex.query('events:get');
        return events || [];
      },
      { ttl: REDIS_TTL.EVENT_DETAILS }
    );
  } catch (error) {
    console.error('getPopularEvents error:', error);
    return []; // Return empty array instead of undefined
  }
}

// Server action for fetching trending events with caching
export async function getTrendingEvents() {
  try {
    return await withCache(
      'trending:events',
      async () => {
        const events = await convex.query('events:get');
        return events || [];
      },
      { ttl: REDIS_TTL.EVENT_DETAILS }
    );
  } catch (error) {
    console.error('getTrendingEvents error:', error);
    return []; // Return empty array instead of undefined
  }
}

// Server action for fetching search results with caching
export async function getSearchResults(query: string) {
  try {
    return await withCache(
      `search:${query.toLowerCase().trim()}`,
      async () => {
        const results = await convex.query('events:search', { searchTerm: query });
        return results || [];
      },
      { ttl: REDIS_TTL.EVENT_DETAILS }
    );
  } catch (error) {
    console.error('getSearchResults error:', error);
    return []; // Return empty array instead of undefined
  }
}

// Server action for fetching event details with caching
export async function getEventDetails(eventId: string) {
  try {
    return await withCache(
      redisKeys.eventDetails(eventId),
      async () => {
        const event = await convex.query('events:getById', { eventId });
        return event || null;
      },
      { ttl: REDIS_TTL.EVENT_DETAILS }
    );
  } catch (error) {
    console.error('getEventDetails error:', error);
    return null; // Return null instead of undefined
  }
}

// Clear specific event cache
export async function invalidateEventCache(eventId: string) {
  if (eventId) {
    await cacheInvalidate(redisKeys.eventDetails(eventId));
  }
}
