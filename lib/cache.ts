/**
 * Redis caching utilities
 * These functions are properly formatted as server actions
 */

"use server";

import { createRedisClient, redisKeys, REDIS_TTL } from './redis';

type CacheOptions = {
  ttl?: number;
  bypassCache?: boolean;
};

/**
 * Wrapper function to implement Redis caching for any server function
 * 
 * @param key Redis cache key
 * @param fetchFn Function to fetch data if not in cache
 * @param options Cache options (TTL, bypass cache)
 * @returns Cached or freshly fetched data
 */
export async function withCache<T>(
  key: string,
  fetchFn: () => Promise<T>,
  options: CacheOptions = {}
): Promise<T> {
  // Create Redis client
  const redis = createRedisClient();
  
  // Early bypass if requested
  if (options.bypassCache) {
    const data = await fetchFn();
    
    // Update cache with fresh data
    await redis.set(key, JSON.stringify(data), options.ttl ? { ex: options.ttl } : undefined);
    
    return data;
  }

  try {
    // Try to get data from cache
    const cachedData = await redis.get(key);
    
    if (cachedData) {
      // Cache hit
      return JSON.parse(cachedData) as T;
    }
    
    // Cache miss - fetch fresh data
    const data = await fetchFn();
    
    // Store in cache
    await redis.set(key, JSON.stringify(data), options.ttl ? { ex: options.ttl } : undefined);
    
    return data;
  } catch (error) {
    // On any cache error, fallback to direct fetch
    console.error('Cache error:', error);
    return fetchFn();
  }
}

/**
 * Invalidate a specific cache key
 */
export async function invalidateCache(key: string): Promise<void> {
  const redis = createRedisClient();
  await redis.del(key);
}

/**
 * Cached event fetcher
 */
export async function getCachedEvent(id: string, fetchFn: () => Promise<any>) {
  return withCache(
    redisKeys.event(id),
    fetchFn,
    { ttl: REDIS_TTL.EVENT }
  );
}

/**
 * Cached event list fetcher
 */
export async function getCachedEventList(fetchFn: () => Promise<any[]>) {
  return withCache(
    redisKeys.eventList(),
    fetchFn,
    { ttl: REDIS_TTL.EVENT_LIST }
  );
}

/**
 * Cached search results
 */
export async function getCachedSearch(query: string, fetchFn: () => Promise<any[]>) {
  return withCache(
    redisKeys.search(query),
    fetchFn,
    { ttl: REDIS_TTL.SEARCH }
  );
}

/**
 * Cached availability data - shorter TTL for freshness
 */
export async function getCachedAvailability(eventId: string, fetchFn: () => Promise<any>) {
  return withCache(
    redisKeys.eventAvailability(eventId),
    fetchFn,
    { ttl: REDIS_TTL.AVAILABILITY }
  );
}
