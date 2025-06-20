/**
 * Redis client and helper functions
 * IMPORTANT: This file should only be imported in server components or server-side code
 */

import { Redis } from '@upstash/redis';
import IORedis from 'ioredis';

// Global Redis client instances (singleton pattern)
let globalRedisClient: any = null;
let connectionAttempts = 0;
const MAX_CONNECTION_ATTEMPTS = 3;

// Create Redis client using Upstash credentials
export function createRedisClient() {
  // Use Upstash Redis HTTP client for production (more stable)
  if (process.env.NODE_ENV === 'production' || process.env.FORCE_UPSTASH === 'true') {
    const url = process.env.UPSTASH_REDIS_REST_URL || "https://tops-mudfish-11616.upstash.io";
    const token = process.env.UPSTASH_REDIS_REST_TOKEN || "AS1gAAIjcDFiN2M5YjQ4MDY0MWM0NTRiOTE3M2U0NDJkNjYxODZiMXAxMA";
    
    return new Redis({
      url,
      token,
      retry: {
        retries: 2,
        backoff: (attempt) => Math.min(attempt * 200, 1000)
      },
    });
  } else {
    // Improved IORedis configuration for development to prevent connection chaos
    const redisUrl = process.env.REDIS_URL || "rediss://default:AS1gAAIjcDFiN2M5YjQ4MDY0MWM0NTRiOTE3M2U0NDJkNjYxODZiMXAxMA@tops-mudfish-11616.upstash.io:6379";
    
    const redisClient = new IORedis(redisUrl, {
      // Connection Settings - MUCH more conservative
      maxRetriesPerRequest: 1, // Reduced from 2
      connectTimeout: 10000, // Increased to 10 seconds
      commandTimeout: 8000, // Increased to 8 seconds
      lazyConnect: true, // Don't connect immediately
      keepAlive: 30000, // Keep connections alive longer
      
      // Retry Strategy - More conservative
      retryStrategy: (times) => {
        if (times > 2) return null; // Give up after 2 retries
        return Math.min(times * 500, 2000); // Longer delays between retries
      },
      
      // Connection pool settings
      family: 4, // Use IPv4
      enableReadyCheck: false, // Disable ready check for faster connections
      maxLoadingTimeout: 5000,
    });
    
    // Add connection event handlers with less verbose logging
    redisClient.on('connect', () => {
      connectionAttempts = 0; // Reset on successful connection
      console.log('✅ Redis connected successfully');
    });
    
    redisClient.on('error', (err) => {
      connectionAttempts++;
      if (connectionAttempts <= MAX_CONNECTION_ATTEMPTS) {
        console.error('❌ Redis connection error:', err.message);
      }
      // Stop logging after max attempts to reduce noise
    });
    
    redisClient.on('close', () => {
      if (connectionAttempts <= MAX_CONNECTION_ATTEMPTS) {
        console.log('🔌 Redis connection closed');
      }
    });
    
    redisClient.on('reconnecting', () => {
      if (connectionAttempts <= MAX_CONNECTION_ATTEMPTS) {
        console.log('🔄 Redis reconnecting...');
      }
    });
    
    // Create a wrapper that matches the @upstash/redis API for consistency
    return {
      get: async (key: string) => {
        try {
          // Check if client is ready
          if (redisClient.status !== 'ready' && redisClient.status !== 'connecting') {
            console.warn(`Redis not ready (status: ${redisClient.status}), returning null for key: ${key}`);
            return null;
          }
          
          const result = await redisClient.get(key);
          if (!result) return null;
          
          try {
            return JSON.parse(result);
          } catch (err) {
            return result; // Return raw string if parsing fails
          }
        } catch (error) {
          console.error(`Redis GET error for key ${key}:`, error.message);
          return null; // Return null on error to prevent crashes
        }
      },
      
      set: async (key: string, value: any, options?: { ex?: number }) => {
        try {
          // Check if client is ready
          if (redisClient.status !== 'ready' && redisClient.status !== 'connecting') {
            console.warn(`Redis not ready (status: ${redisClient.status}), skipping SET for key: ${key}`);
            return 'ERROR';
          }
          
          let serializedValue;
          try {
            if (typeof value === 'string' && value === '[object Object]') {
              serializedValue = JSON.stringify({});
            } else {
              serializedValue = JSON.stringify(value);
            }
          } catch (err) {
            console.error(`Failed to serialize value for Redis key ${key}:`, err);
            serializedValue = JSON.stringify({});
          }
          
          if (options?.ex) {
            await redisClient.set(key, serializedValue, 'EX', options.ex);
          } else {
            await redisClient.set(key, serializedValue);
          }
          return 'OK';
        } catch (error) {
          console.error(`Redis SET error for key ${key}:`, error.message);
          return 'ERROR';
        }
      },
      
      del: async (key: string) => {
        try {
          if (redisClient.status !== 'ready' && redisClient.status !== 'connecting') {
            return 'ERROR';
          }
          await redisClient.del(key);
          return 'OK';
        } catch (error) {
          console.error(`Redis DEL error for key ${key}:`, error.message);
          return 'ERROR';
        }
      },
      
      ping: async () => {
        try {
          await redisClient.ping();
          return 'PONG';
        } catch (error) {
          return 'ERROR';
        }
      },
      
      disconnect: async () => {
        try {
          await redisClient.disconnect();
        } catch (error) {
          console.error('Redis disconnect error:', error);
        }
      },
      
      // Expose status for debugging
      getStatus: () => redisClient.status
    };
  }
}

// TTL configurations - INCREASED to reduce Redis pressure
export const REDIS_TTL = {
  EVENT: 60 * 60, // 1 hour for event data (increased)
  EVENT_LIST: 60 * 30, // 30 minutes for event listings
  SEARCH: 60 * 20, // 20 minutes for search results 
  AVAILABILITY: 60 * 2, // 2 minutes for availability data (increased from 30s)
  USER: 60 * 60 * 2, // 2 hours for user data
  QUEUE_POSITION: 60 * 5, // 5 minutes for queue positions (reduced from 10)
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

export function getRedisClient() {
  if (!globalRedisClient) {
    globalRedisClient = createRedisClient();
  }
  return globalRedisClient;
}
