/**
 * Redis client and helper functions
 * IMPORTANT: This file should only be imported in server components or server-side code
 */

import { Redis } from '@upstash/redis';
import IORedis from 'ioredis';

// Single shared Redis client instance to prevent connection overload
let sharedRedisClient: any = null;
let isConnecting = false;
let connectionPromise: Promise<any> | null = null;

// Circuit breaker for Redis stability
let redisCircuitBreakerOpen = false;
let redisFailureCount = 0;
let lastRedisFailureTime = 0;
const REDIS_FAILURE_THRESHOLD = 5;
const REDIS_RESET_TIMEOUT = 60000; // 60 seconds

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

// Create a single shared Redis connection
async function createSharedRedisConnection() {
  // If already connecting, wait for that connection
  if (isConnecting && connectionPromise) {
    return connectionPromise;
  }
  
  // If we already have a connection, return it
  if (sharedRedisClient) {
    return sharedRedisClient;
  }
  
  isConnecting = true;
  
  connectionPromise = new Promise(async (resolve, reject) => {
    try {
      console.log('🔌 Creating shared Redis connection...');
      
      // Use Upstash for production, IORedis for development
      if (process.env.NODE_ENV === 'production' || process.env.FORCE_UPSTASH === 'true') {
        const url = process.env.UPSTASH_REDIS_REST_URL || "https://tops-mudfish-11616.upstash.io";
        const token = process.env.UPSTASH_REDIS_REST_TOKEN || "AS1gAAIjcDFiN2M5YjQ4MDY0MWM0NTRiOTE3M2U0NDJkNjYxODZiMXAxMA";
        
        const client = new Redis({
          url,
          token,
          retry: {
            retries: 1,
            backoff: (attempt) => Math.min(attempt * 500, 2000)
          },
        });
        
        sharedRedisClient = wrapUpstashClient(client);
      } else {
        const redisUrl = process.env.REDIS_URL || "rediss://default:AS1gAAIjcDFiN2M5YjQ4MDY0MWM0NTRiOTE3M2U0NDJkNjYxODZiMXAxMA@tops-mudfish-11616.upstash.io:6379";
        
        const client = new IORedis(redisUrl, {
          maxRetriesPerRequest: 0, // Don't retry on this connection
          connectTimeout: 10000,
          commandTimeout: 5000,
          lazyConnect: false, // Connect immediately
          family: 4,
          keepAlive: true,
          retryStrategy: () => null, // Don't auto-retry
        });
        
        // Wait for connection
        await new Promise((resolve, reject) => {
          client.on('connect', () => {
            console.log('✅ Shared Redis connected successfully');
            recordRedisSuccess();
            resolve(client);
          });
          
          client.on('error', (err) => {
            console.error('❌ Shared Redis connection error:', err.message);
            recordRedisFailure();
            reject(err);
          });
          
          // Timeout after 10 seconds
          setTimeout(() => {
            reject(new Error('Redis connection timeout'));
          }, 10000);
        });
        
        sharedRedisClient = wrapIORedisClient(client);
      }
      
      console.log('✅ Shared Redis connection ready');
      resolve(sharedRedisClient);
      
    } catch (error) {
      console.error('❌ Failed to create shared Redis connection:', error);
      recordRedisFailure();
      sharedRedisClient = createMockRedisClient();
      resolve(sharedRedisClient);
    } finally {
      isConnecting = false;
      connectionPromise = null;
    }
  });
  
  return connectionPromise;
}

// Create Redis client using shared connection
export function createRedisClient() {
  // Check circuit breaker first
  if (!checkRedisCircuitBreaker()) {
    console.log('⚡ Redis circuit breaker is open - using mock client');
    return createMockRedisClient();
  }

  // Return existing connection or create new one
  if (sharedRedisClient) {
    return sharedRedisClient;
  }
  
  // Return a promise-based client that waits for connection
  return {
    get: async (key: string) => {
      const client = await createSharedRedisConnection();
      return client.get(key);
    },
    set: async (key: string, value: any, options?: { ex?: number }) => {
      const client = await createSharedRedisConnection();
      return client.set(key, value, options);
    },
    del: async (key: string) => {
      const client = await createSharedRedisConnection();
      return client.del(key);
    },
    ping: async () => {
      const client = await createSharedRedisConnection();
      return client.ping();
    },
    disconnect: async () => {
      if (sharedRedisClient && sharedRedisClient.disconnect) {
        await sharedRedisClient.disconnect();
        sharedRedisClient = null;
      }
    }
  };
}

// Wrapper for Upstash Redis with circuit breaker
function wrapUpstashClient(client: Redis) {
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
        return null;
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
