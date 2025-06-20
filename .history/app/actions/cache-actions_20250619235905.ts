"use server";

import { redisKeys, REDIS_TTL } from '@/lib/redis';
import { withCache } from '@/lib/cache';
import { Id } from '@/convex/_generated/dataModel';

// Import Convex client - using dynamic import to avoid bundling server code with client
const { ConvexHttpClient } = require('convex/browser');

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL || '');

// Server action for fetching events with caching
export async function getFeaturedEvents() {
  return withCache(
    redisKeys.eventList(),
    () => convex.query('events:get'),
    { ttl: REDIS_TTL.EVENT_LIST }
  );
}

// Server action for fetching event categories with caching
export async function getEventCategories() {
  return withCache(
    'categories:list',
    async () => {
      // Return mock categories if actual endpoint doesn't exist
      return Promise.resolve([
        { id: 'music', name: 'Music' },
        { id: 'sports', name: 'Sports' },
        { id: 'arts', name: 'Arts & Theater' },
        { id: 'workshops', name: 'Workshops' },
        { id: 'conferences', name: 'Conferences' }
      ]);
    },
    { ttl: REDIS_TTL.EVENT_LIST }
  );
}

// Server action for fetching popular events with caching
export async function getPopularEvents() {
  return withCache(
    'popular:events',
    () => convex.query('events:get'),
    { ttl: REDIS_TTL.EVENT_LIST }
  );
}

// Server action for fetching trending events with caching
export async function getTrendingEvents() {
  return withCache(
    'trending:events',
    () => convex.query('events:get'),
    { ttl: REDIS_TTL.EVENT_LIST }
  );
}

// Server action for fetching search results with caching
export async function getSearchResults(query: string) {
  return withCache(
    redisKeys.search(query),
    () => convex.query('events:search', { searchTerm: query }),
    { ttl: REDIS_TTL.SEARCH }
  );
}

// Server action for fetching event details with caching
export async function getEventDetails(eventId: string) {
  return withCache(
    redisKeys.eventDetails(eventId),
    () => convex.query('events:getById', { eventId }),
    { ttl: REDIS_TTL.EVENT }
  );
}

// Clear specific event cache
export async function invalidateCache(eventId: string) {
  if (eventId) {
    await invalidateCache(redisKeys.eventDetails(eventId));
  }
}
