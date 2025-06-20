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
      // Add production-ready configurations
      retry: {
        retries: 3,
        backoff: (attempt) => Math.min(attempt * 100, 3000)
      },
    });
  } else {
    // Use IORedis for server environments that support TCP
    // This allows for connection pooling and better performance on servers
    const redisUrl = process.env.REDIS_URL || "rediss://default:AS1gAAIjcDFiN2M5YjQ4MDY0MWM0NTRiOTE3M2U0NDJkNjYxODZiMXAxMA@tops-mudfish-11616.upstash.io:6379";
    
    const redisClient = new IORedis(redisUrl, {
      // Connection Settings
      maxRetriesPerRequest: 2,
      connectTimeout: 5000,
      commandTimeout: 3000,
      
      // Retry Strategy
      retryStrategy: (times) => {
        if (times > 2) return null;
        return Math.min(times * 100, 1000);
      },
      
      // Use IPv4
      family: 4,
    });
    
    // Add connection event handlers for monitoring
    redisClient.on('connect', () => {
      console.log('✅ Redis connected successfully');
    });
    
    redisClient.on('error', (err) => {
      console.error('❌ Redis connection error:', err.message);
    });
    
    redisClient.on('close', () => {
      console.log('🔌 Redis connection closed');
    });
    
    // Create a wrapper that matches the @upstash/redis API for consistency
    return {
      get: async (key: string) => {
        try {
          const result = await redisClient.get(key);
          if (!result) return null;
          
          try {
            return JSON.parse(result);
          } catch (err) {
            console.error(`Failed to parse Redis value for key ${key}:`, err);
            return result; // Return raw string if parsing fails
          }
        } catch (error) {
          console.error(`Redis GET error for key ${key}:`, error);
          return null; // Return null on error to prevent crashes
        }
      },
      set: async (key: string, value: any, options?: { ex?: number }) => {
        try {
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
        } catch (error) {
          console.error(`Redis SET error for key ${key}:`, error);
          return 'ERROR'; // Return error status instead of throwing
        }
      },
      del: async (key: string) => {
        try {
          await redisClient.del(key);
          return 'OK';
        } catch (error) {
          console.error(`Redis DEL error for key ${key}:`, error);
          return 'ERROR';
        }
      },
      // Add health check method
      ping: async () => {
        try {
          await redisClient.ping();
          return 'PONG';
        } catch (error) {
          console.error('Redis PING error:', error);
          return 'ERROR';
        }
      },
      // Graceful shutdown
      disconnect: async () => {
        try {
          await redisClient.disconnect();
        } catch (error) {
          console.error('Redis disconnect error:', error);
        }
      }
    };
  }
}

// TTL (Time to Live) configurations for different data types - OPTIMIZED FOR PRODUCTION
export const REDIS_TTL = {
  EVENT: 60 * 30, // 30 minutes for event data (increased for better caching)
  EVENT_LIST: 60 * 15, // 15 minutes for event listings (increased)
  SEARCH: 60 * 10, // 10 minutes for search results (increased)
  AVAILABILITY: 30, // 30 seconds for availability data (reduced for freshness)
  USER: 60 * 60, // 1 hour for user data (increased)
  QUEUE_POSITION: 60 * 10, // 10 minutes for queue positions
};

// Key generation helpers to ensure consistent key naming
export const redisKeys = {
  event: (id: string) => `event:${id}`,
  eventList: () => 'events:list',
  eventAvailability: (id: string) => `event:${id}:availability`,
  search: (query: string) => `search:${query.toLowerCase().trim()}`,
  user: (id: string) => `user:${id}`,
  queuePosition: (eventId: string, userId: string) => `queue:${eventId}:${userId}`,
};

// Global Redis client instance (singleton pattern for better performance)
let globalRedisClient: any = null;

export function getRedisClient() {
  if (!globalRedisClient) {
    globalRedisClient = createRedisClient();
  }
  return globalRedisClient;
}
