/**
 * Redis client and helper functions
 * IMPORTANT: This file should only be imported in server components or server-side code
 */

import { Redis } from '@upstash/redis';
import IORedis from 'ioredis';

// Global Redis client instances to prevent connection leaks
let globalUpstashClient: Redis | null = null;
let globalIORedisClient: IORedis | null = null;

// Circuit breaker for Redis stability
let redisCircuitBreakerOpen = false;
let redisFailureCount = 0;
let lastRedisFailureTime = 0;
const REDIS_FAILURE_THRESHOLD = 3;
const REDIS_RESET_TIMEOUT = 30000; // 30 seconds

function checkRedisCircuitBreaker(): boolean {
  if (!redisCircuitBreakerOpen) return true;
  
  // Check if we should reset the circuit breaker
  if (Date.now() - lastRedisFailureTime > REDIS_RESET_TIMEOUT) {
    redisCircuitBreakerOpen = false;
    redisFailureCount = 0;
    console.log('🔄 Redis circuit breaker reset - attempting reconnection');
    return true;
  }
  
  return false;
}

function recordRedisFailure() {
  redisFailureCount++;
  lastRedisFailureTime = Date.now();
  
  if (redisFailureCount >= REDIS_FAILURE_THRESHOLD) {
    redisCircuitBreakerOpen = true;
    console.log(`⚡ Redis circuit breaker opened - too many failures (${redisFailureCount})`);
  }
}

function recordRedisSuccess() {
  if (redisFailureCount > 0) {
    redisFailureCount = Math.max(0, redisFailureCount - 1);
  }
}

// Create Redis client using Upstash credentials
export function createRedisClient() {
  // Check circuit breaker first
  if (!checkRedisCircuitBreaker()) {
    console.log('⚡ Redis circuit breaker is open - skipping Redis operations');
    return createMockRedisClient();
  }

  // In production or when we want HTTP-based Redis, use Upstash
  if (process.env.NODE_ENV === 'production' || process.env.FORCE_UPSTASH === 'true') {
    if (!globalUpstashClient) {
      const url = process.env.UPSTASH_REDIS_REST_URL || "https://tops-mudfish-11616.upstash.io";
      const token = process.env.UPSTASH_REDIS_REST_TOKEN || "AS1gAAIjcDFiN2M5YjQ4MDY0MWM0NTRiOTE3M2U0NDJkNjYxODZiMXAxMA";
      
      globalUpstashClient = new Redis({
        url,
        token,
        retry: {
          retries: 1, // Reduced retries
          backoff: (attempt) => Math.min(attempt * 200, 1000)
        },
      });
    }
    return wrapRedisClient(globalUpstashClient);
  } else {
    // Use IORedis for development with improved connection pooling
    if (!globalIORedisClient) {
      const redisUrl = process.env.REDIS_URL || "rediss://default:AS1gAAIjcDFiN2M5YjQ4MDY0MWM0NTRiOTE3M2U0NDJkNjYxODZiMXAxMA@tops-mudfish-11616.upstash.io:6379";
      
      globalIORedisClient = new IORedis(redisUrl, {
        // Connection Settings - More conservative for stability
        maxRetriesPerRequest: 1,
        connectTimeout: 5000, // Reduced timeout
        commandTimeout: 3000, // Reduced timeout
        lazyConnect: true,
        
        // Retry Strategy - Very conservative
        retryStrategy: (times) => {
          if (times > 1) return null; // Give up after 1 retry
          return 500; // Quick retry
        },
        
        // Reconnection settings
        reconnectOnError: () => false, // Don't auto-reconnect on errors
        
        // Use IPv4
        family: 4,
        
        // Keep alive settings
        keepAlive: true,
        keepAliveInitialDelay: 0,
      });
      
      // Add connection event handlers for monitoring
      globalIORedisClient.on('connect', () => {
        console.log('✅ Redis connected successfully');
        recordRedisSuccess();
      });
      
      globalIORedisClient.on('error', (err) => {
        console.error('❌ Redis connection error:', err.message);
        recordRedisFailure();
      });
      
      globalIORedisClient.on('close', () => {
        console.log('🔌 Redis connection closed');
      });
    }
    
    // Create a wrapper that matches the @upstash/redis API for consistency
    return wrapIORedisClient(globalIORedisClient);
  }
}

// Wrapper for Upstash Redis with circuit breaker
function wrapRedisClient(client: Redis) {
  return {
    get: async (key: string) => {
      if (!checkRedisCircuitBreaker()) return null;
      try {
        const result = await client.get(key);
        recordRedisSuccess();
        return result;
      } catch (error) {
        recordRedisFailure();
        console.error(`Redis GET error for key ${key}:`, error);
        return null;
      }
    },
    set: async (key: string, value: any, options?: { ex?: number }) => {
      if (!checkRedisCircuitBreaker()) return 'SKIPPED';
      try {
        const result = await client.set(key, value, options);
        recordRedisSuccess();
        return result;
      } catch (error) {
        recordRedisFailure();
        console.error(`Redis SET error for key ${key}:`, error);
        return 'ERROR';
      }
    },
    del: async (key: string) => {
      if (!checkRedisCircuitBreaker()) return 'SKIPPED';
      try {
        const result = await client.del(key);
        recordRedisSuccess();
        return result;
      } catch (error) {
        recordRedisFailure();
        console.error(`Redis DEL error for key ${key}:`, error);
        return 'ERROR';
      }
    },
    ping: async () => {
      if (!checkRedisCircuitBreaker()) return 'CIRCUIT_OPEN';
      try {
        const result = await client.ping();
        recordRedisSuccess();
        return result;
      } catch (error) {
        recordRedisFailure();
        console.error('Redis PING error:', error);
        return 'ERROR';
      }
    },
    disconnect: async () => {
      try {
        await client.disconnect();
        globalUpstashClient = null;
      } catch (error) {
        console.error('Redis disconnect error:', error);
      }
    }
  };
}

// Wrapper for IORedis with circuit breaker
function wrapIORedisClient(client: IORedis) {
  return {
    get: async (key: string) => {
      if (!checkRedisCircuitBreaker()) return null;
      try {
        const result = await client.get(key);
        if (!result) return null;
        
        try {
          recordRedisSuccess();
          return JSON.parse(result);
        } catch (err) {
          console.error(`Failed to parse Redis value for key ${key}:`, err);
          return result; // Return raw string if parsing fails
        }
      } catch (error) {
        recordRedisFailure();
        console.error(`Redis GET error for key ${key}:`, error);
        return null; // Return null on error to prevent crashes
      }
    },
    set: async (key: string, value: any, options?: { ex?: number }) => {
      if (!checkRedisCircuitBreaker()) return 'SKIPPED';
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
          await client.set(key, serializedValue, 'EX', options.ex);
        } else {
          await client.set(key, serializedValue);
        }
        recordRedisSuccess();
        return 'OK';
      } catch (error) {
        recordRedisFailure();
        console.error(`Redis SET error for key ${key}:`, error);
        return 'ERROR';
      }
    },
    del: async (key: string) => {
      if (!checkRedisCircuitBreaker()) return 'SKIPPED';
      try {
        await client.del(key);
        recordRedisSuccess();
        return 'OK';
      } catch (error) {
        recordRedisFailure();
        console.error(`Redis DEL error for key ${key}:`, error);
        return 'ERROR';
      }
    },
    ping: async () => {
      if (!checkRedisCircuitBreaker()) return 'CIRCUIT_OPEN';
      try {
        await client.ping();
        recordRedisSuccess();
        return 'PONG';
      } catch (error) {
        recordRedisFailure();
        console.error('Redis PING error:', error);
        return 'ERROR';
      }
    },
    disconnect: async () => {
      try {
        await client.disconnect();
        globalIORedisClient = null; // Reset global client
      } catch (error) {
        console.error('Redis disconnect error:', error);
      }
    }
  };
}

// Mock Redis client for when circuit breaker is open
function createMockRedisClient() {
  return {
    get: async (key: string) => null,
    set: async (key: string, value: any, options?: { ex?: number }) => 'CIRCUIT_OPEN',
    del: async (key: string) => 'CIRCUIT_OPEN',
    ping: async () => 'CIRCUIT_OPEN',
    disconnect: async () => {},
  };
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
