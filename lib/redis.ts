/**
 * Redis client and helper functions
 * IMPORTANT: This file should only be imported in server components or server-side code
 */

import { Redis } from '@upstash/redis';
import IORedis from 'ioredis';

// Create Redis client using Upstash credentials
export function createRedisClient() {
  // Use Upstash Redis HTTP client (for Edge and serverless)
  if (typeof window === 'undefined' && process.env.NODE_ENV === 'production') {
    const url = process.env.UPSTASH_REDIS_REST_URL || "https://tops-mudfish-11616.upstash.io";
    const token = process.env.UPSTASH_REDIS_REST_TOKEN || "AS1gAAIjcDFiN2M5YjQ4MDY0MWM0NTRiOTE3M2U0NDJkNjYxODZiMXAxMA";
    
    return new Redis({
      url,
      token,
    });
  } else {
    // Use IORedis for server environments that support TCP
    // This allows for connection pooling and better performance on servers
    const redisUrl = process.env.REDIS_URL || "rediss://default:AS1gAAIjcDFiN2M5YjQ4MDY0MWM0NTRiOTE3M2U0NDJkNjYxODZiMXAxMA@tops-mudfish-11616.upstash.io:6379";
    
    const redisClient = new IORedis(redisUrl, {
      tls: { rejectUnauthorized: false }, // Required for TLS connection
      retryStrategy: (times) => Math.min(times * 50, 2000), // Exponential backoff
      maxRetriesPerRequest: 3,
    });
    
    // Create a wrapper that matches the @upstash/redis API for consistency
    return {
      get: async (key: string) => {
        const result = await redisClient.get(key);
        if (!result) return null;
        
        try {
          return JSON.parse(result);
        } catch (err) {
          console.error(`Failed to parse Redis value for key ${key}:`, err);
          return result; // Return raw string if parsing fails
        }
      },
      set: async (key: string, value: any, options?: { ex?: number }) => {
        let serializedValue;
        
        try {
          // Handle non-serializable values (like [object Object] strings)
          if (typeof value === 'string' && value === '[object Object]') {
            console.warn(`Attempting to cache non-serializable string '[object Object]' for key ${key}`);
            serializedValue = JSON.stringify({});
          } else {
            serializedValue = JSON.stringify(value);
          }
        } catch (err) {
          console.error(`Failed to serialize value for Redis key ${key}:`, err);
          // Fallback to empty object rather than failing
          serializedValue = JSON.stringify({});
        }
        
        if (options?.ex) {
          await redisClient.set(key, serializedValue, 'EX', options.ex);
        } else {
          await redisClient.set(key, serializedValue);
        }
        return 'OK';
      },
      del: async (key: string) => {
        await redisClient.del(key);
        return 'OK';
      },
      // Additional methods can be added as needed
    };
  }
}

// TTL (Time to Live) configurations for different data types
export const REDIS_TTL = {
  EVENT: 60 * 15, // 15 minutes for event data
  EVENT_LIST: 60 * 10, // 10 minutes for event listings
  SEARCH: 60 * 5, // 5 minutes for search results
  AVAILABILITY: 60, // 1 minute for availability data (needs to be fresh)
  USER: 60 * 30, // 30 minutes for user data
};

// Key generation helpers to ensure consistent key naming
export const redisKeys = {
  event: (id: string) => `event:${id}`,
  eventList: () => 'events:list',
  eventAvailability: (id: string) => `event:${id}:availability`,
  search: (query: string) => `search:${query.toLowerCase().trim()}`,
  user: (id: string) => `user:${id}`,
};
