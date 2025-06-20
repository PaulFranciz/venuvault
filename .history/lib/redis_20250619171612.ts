/**
 * Redis client and helper functions
 * IMPORTANT: This file should only be imported in server components or server-side code
 */

import { Redis } from '@upstash/redis';
import IORedis from 'ioredis';

// Global Redis client instances to prevent connection leaks
let globalUpstashClient: Redis | null = null;
let globalIORedisClient: IORedis | null = null;

// Create Redis client using Upstash credentials
export function createRedisClient() {
  // In production or when we want HTTP-based Redis, use Upstash
  if (process.env.NODE_ENV === 'production' || process.env.FORCE_UPSTASH === 'true') {
    if (!globalUpstashClient) {
      const url = process.env.UPSTASH_REDIS_REST_URL || "https://tops-mudfish-11616.upstash.io";
      const token = process.env.UPSTASH_REDIS_REST_TOKEN || "AS1gAAIjcDFiN2M5YjQ4MDY0MWM0NTRiOTE3M2U0NDJkNjYxODZiMXAxMA";
      
      globalUpstashClient = new Redis({
        url,
        token,
        retry: {
          retries: 2,
          backoff: (attempt) => Math.min(attempt * 200, 1000)
        },
      });
    }
    return globalUpstashClient;
  } else {
    // Use IORedis for development with improved connection pooling
    if (!globalIORedisClient) {
      const redisUrl = process.env.REDIS_URL || "rediss://default:AS1gAAIjcDFiN2M5YjQ4MDY0MWM0NTRiOTE3M2U0NDJkNjYxODZiMXAxMA@tops-mudfish-11616.upstash.io:6379";
      
      globalIORedisClient = new IORedis(redisUrl, {
        // Connection Settings - More aggressive settings for stability
        maxRetriesPerRequest: 1, // Reduced from 2
        connectTimeout: 8000, // Increased timeout
        commandTimeout: 5000, // Increased timeout
        lazyConnect: true, // Don't connect immediately
        
        // Connection Pool Settings
        maxMemoryPolicy: 'noeviction', // Prevent data eviction
        
        // Retry Strategy - Less aggressive
        retryStrategy: (times) => {
          if (times > 2) return null; // Give up after 2 retries
          return Math.min(times * 200, 1000);
        },
        
        // Reconnection settings
        reconnectOnError: (err) => {
          const targetError = 'READONLY';
          return err.message.includes(targetError);
        },
        
        // Use IPv4
        family: 4,
        
        // Keep alive settings
        keepAlive: true,
        keepAliveInitialDelay: 0,
      });
      
      // Add connection event handlers for monitoring
      globalIORedisClient.on('connect', () => {
        console.log('✅ Redis connected successfully');
      });
      
      globalIORedisClient.on('error', (err) => {
        console.error('❌ Redis connection error:', err.message);
      });
      
      globalIORedisClient.on('close', () => {
        console.log('🔌 Redis connection closed');
      });
      
      globalIORedisClient.on('reconnecting', () => {
        console.log('🔄 Redis reconnecting...');
      });
    }
    
    // Create a wrapper that matches the @upstash/redis API for consistency
    return {
      get: async (key: string) => {
        try {
          const result = await globalIORedisClient!.get(key);
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
            // Handle non-serializable values
            if (typeof value === 'string' && value === '[object Object]') {
              console.warn(`Attempting to cache non-serializable string '[object Object]' for key ${key}`);
              serializedValue = JSON.stringify({});
            } else {
              serializedValue = JSON.stringify(value);
            }
          } catch (err) {
            console.error(`Failed to serialize value for Redis key ${key}:`, err);
            serializedValue = JSON.stringify({});
          }
          
          if (options?.ex) {
            await globalIORedisClient!.set(key, serializedValue, 'EX', options.ex);
          } else {
            await globalIORedisClient!.set(key, serializedValue);
          }
          return 'OK';
        } catch (error) {
          console.error(`Redis SET error for key ${key}:`, error);
          return 'ERROR';
        }
      },
      del: async (key: string) => {
        try {
          await globalIORedisClient!.del(key);
          return 'OK';
        } catch (error) {
          console.error(`Redis DEL error for key ${key}:`, error);
          return 'ERROR';
        }
      },
      ping: async () => {
        try {
          await globalIORedisClient!.ping();
          return 'PONG';
        } catch (error) {
          console.error('Redis PING error:', error);
          return 'ERROR';
        }
      },
      disconnect: async () => {
        try {
          await globalIORedisClient!.disconnect();
          globalIORedisClient = null; // Reset global client
        } catch (error) {
          console.error('Redis disconnect error:', error);
        }
      }
    };
  }
}

// TTL configurations - INCREASED for stability
export const REDIS_TTL = {
  EVENT: 60 * 60, // 1 hour for event data (increased for stability)
  EVENT_LIST: 60 * 30, // 30 minutes for event listings
  SEARCH: 60 * 15, // 15 minutes for search results
  AVAILABILITY: 60 * 2, // 2 minutes for availability data (increased)
  USER: 60 * 60 * 2, // 2 hours for user data
  QUEUE_POSITION: 60 * 5, // 5 minutes for queue positions (increased)
};

// Key generation helpers
export const redisKeys = {
  event: (id: string) => `event:${id}`,
  eventList: () => 'events:list',
  eventAvailability: (id: string) => `event:${id}:availability`,
  search: (query: string) => `search:${query.toLowerCase().trim()}`,
  user: (id: string) => `user:${id}`,
  queuePosition: (eventId: string, userId: string) => `queue:${eventId}:${userId}`,
};

// Singleton pattern for better performance
export function getRedisClient() {
  return createRedisClient();
}
