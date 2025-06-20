/**
 * Optimized Redis client and helper functions for high performance
 * IMPORTANT: This file should only be imported in server components or server-side code
 */

import { Redis } from '@upstash/redis';
import IORedis from 'ioredis';

// Connection pool management
let sharedRedisClient: any = null;
let isConnecting = false;
let connectionPromise: Promise<any> | null = null;
let connectionPool: IORedis[] = [];
const MAX_POOL_SIZE = 5;
let currentPoolIndex = 0;

// Enhanced circuit breaker for Redis stability
let redisCircuitBreakerOpen = false;
let redisFailureCount = 0;
let lastRedisFailureTime = 0;
const REDIS_FAILURE_THRESHOLD = 3; // Reduced threshold for faster detection
const REDIS_RESET_TIMEOUT = 30000; // 30 seconds (reduced for faster recovery)

// Performance monitoring
let redisMetrics = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  averageResponseTime: 0,
  lastResetTime: Date.now()
};

function updateRedisMetrics(success: boolean, responseTime: number) {
  redisMetrics.totalRequests++;
  if (success) {
    redisMetrics.successfulRequests++;
  } else {
    redisMetrics.failedRequests++;
  }
  
  // Update average response time (rolling average)
  redisMetrics.averageResponseTime = 
    (redisMetrics.averageResponseTime * (redisMetrics.totalRequests - 1) + responseTime) / redisMetrics.totalRequests;
}

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

// Create optimized Redis connection pool
async function createOptimizedConnection() {
  try {
    const redisUrl = process.env.REDIS_URL || "rediss://default:AS1gAAIjcDFiN2M5YjQ4MDY0MWM0NTRiOTE3M2U0NDJkNjYxODZiMXAxMA@tops-mudfish-11616.upstash.io:6379";
    
    const client = new IORedis(redisUrl, {
      // Optimized connection settings
      maxRetriesPerRequest: 1, // Limited retries for faster failover
      connectTimeout: 5000, // Reduced timeout for faster detection
      commandTimeout: 3000, // Faster command timeout
      lazyConnect: false,
      family: 4,
      keepAlive: true,
      retryStrategy: (times) => {
        if (times > 1) return null; // Don't retry more than once
        return Math.min(times * 200, 1000); // Fast retry
      },
      // Connection pool settings
      enableReadyCheck: true,
      maxLoadingTimeout: 5000,
    });
    
    // Enhanced connection monitoring
    client.on('connect', () => {
      console.log('✅ Redis connection established');
      recordRedisSuccess();
    });
    
    client.on('error', (err) => {
      console.error('❌ Redis connection error:', err.message.substring(0, 100));
      recordRedisFailure();
    });
    
    client.on('close', () => {
      console.log('🔌 Redis connection closed');
    });
    
    // Wait for connection with timeout
    await Promise.race([
      new Promise((resolve) => {
        client.on('ready', resolve);
      }),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Connection timeout')), 5000);
      })
    ]);
    
    return client;
  } catch (error) {
    console.error('❌ Failed to create Redis connection:', error);
    throw error;
  }
}

// Initialize connection pool
async function initializeConnectionPool() {
  if (connectionPool.length > 0) return;
  
  console.log('🏊 Initializing Redis connection pool...');
  
  try {
    // Create initial connections (start with 2, grow as needed)
    const initialConnections = Math.min(2, MAX_POOL_SIZE);
    const connectionPromises = [];
    
    for (let i = 0; i < initialConnections; i++) {
      connectionPromises.push(createOptimizedConnection());
    }
    
    const connections = await Promise.allSettled(connectionPromises);
    
    connections.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        connectionPool.push(result.value);
        console.log(`✅ Pool connection ${index + 1} ready`);
      } else {
        console.error(`❌ Pool connection ${index + 1} failed:`, result.reason);
      }
    });
    
    if (connectionPool.length === 0) {
      throw new Error('Failed to create any pool connections');
    }
    
    console.log(`🏊 Connection pool initialized with ${connectionPool.length} connections`);
  } catch (error) {
    console.error('❌ Failed to initialize connection pool:', error);
    throw error;
  }
}

// Get connection from pool (round-robin)
function getPoolConnection() {
  if (connectionPool.length === 0) {
    throw new Error('No connections available in pool');
  }
  
  const connection = connectionPool[currentPoolIndex];
  currentPoolIndex = (currentPoolIndex + 1) % connectionPool.length;
  
  return connection;
}

// Create high-performance Redis client
export function createRedisClient() {
  // Check circuit breaker first
  if (!checkRedisCircuitBreaker()) {
    console.log('⚡ Redis circuit breaker is open - using mock client');
    return createMockRedisClient();
  }

  return {
    get: async (key: string) => {
      const startTime = performance.now();
      try {
        // Initialize pool if needed
        if (connectionPool.length === 0) {
          await initializeConnectionPool();
        }
        
        const client = getPoolConnection();
        const result = await client.get(key);
        
        const responseTime = performance.now() - startTime;
        updateRedisMetrics(true, responseTime);
        recordRedisSuccess();
        
        return result;
      } catch (error) {
        const responseTime = performance.now() - startTime;
        updateRedisMetrics(false, responseTime);
        recordRedisFailure();
        console.error(`Redis GET error for key ${key}:`, error.message);
        return null;
      }
    },
    
    set: async (key: string, value: any, options?: { ex?: number }) => {
      const startTime = performance.now();
      try {
        // Initialize pool if needed
        if (connectionPool.length === 0) {
          await initializeConnectionPool();
        }
        
        const client = getPoolConnection();
        
        // Handle different value types
        const serializedValue = typeof value === 'string' ? value : JSON.stringify(value);
        
        let result;
        if (options?.ex) {
          result = await client.set(key, serializedValue, 'EX', options.ex);
        } else {
          result = await client.set(key, serializedValue);
        }
        
        const responseTime = performance.now() - startTime;
        updateRedisMetrics(true, responseTime);
        recordRedisSuccess();
        
        return result;
      } catch (error) {
        const responseTime = performance.now() - startTime;
        updateRedisMetrics(false, responseTime);
        recordRedisFailure();
        console.error(`Redis SET error for key ${key}:`, error.message);
        return null;
      }
    },
    
    del: async (key: string) => {
      const startTime = performance.now();
      try {
        if (connectionPool.length === 0) {
          await initializeConnectionPool();
        }
        
        const client = getPoolConnection();
        const result = await client.del(key);
        
        const responseTime = performance.now() - startTime;
        updateRedisMetrics(true, responseTime);
        recordRedisSuccess();
        
        return result;
      } catch (error) {
        const responseTime = performance.now() - startTime;
        updateRedisMetrics(false, responseTime);
        recordRedisFailure();
        console.error(`Redis DEL error for key ${key}:`, error);
        return 0;
      }
    },
    
    ping: async () => {
      const startTime = performance.now();
      try {
        if (connectionPool.length === 0) {
          await initializeConnectionPool();
        }
        
        const client = getPoolConnection();
        const result = await client.ping();
        
        const responseTime = performance.now() - startTime;
        updateRedisMetrics(true, responseTime);
        recordRedisSuccess();
        
        return result;
      } catch (error) {
        const responseTime = performance.now() - startTime;
        updateRedisMetrics(false, responseTime);
        recordRedisFailure();
        console.error('Redis PING error:', error);
        return null;
      }
    },
    
    // Get performance metrics
    getMetrics: () => ({
      ...redisMetrics,
      circuitBreakerOpen: redisCircuitBreakerOpen,
      failureCount: redisFailureCount,
      poolSize: connectionPool.length,
      successRate: redisMetrics.totalRequests > 0 
        ? (redisMetrics.successfulRequests / redisMetrics.totalRequests * 100).toFixed(2)
        : '0.00'
    }),
    
    disconnect: async () => {
      console.log('🔌 Disconnecting Redis pool...');
      const disconnectPromises = connectionPool.map(client => {
        return client.disconnect().catch(err => {
          console.error('Error disconnecting client:', err);
        });
      });
      
      await Promise.allSettled(disconnectPromises);
      connectionPool = [];
      sharedRedisClient = null;
      console.log('✅ Redis pool disconnected');
    }
  };
}

// Enhanced mock client for fallback
function createMockRedisClient() {
  console.log('🔄 Using mock Redis client (circuit breaker or connection failure)');
  
  return {
    get: async (key: string) => {
      console.log(`Mock Redis GET: ${key}`);
      return null;
    },
    set: async (key: string, value: any, options?: { ex?: number }) => {
      console.log(`Mock Redis SET: ${key}`);
      return 'OK';
    },
    del: async (key: string) => {
      console.log(`Mock Redis DEL: ${key}`);
      return 1;
    },
    ping: async () => {
      console.log('Mock Redis PING');
      return 'PONG';
    },
    getMetrics: () => ({
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      circuitBreakerOpen: true,
      failureCount: redisFailureCount,
      poolSize: 0,
      successRate: '0.00',
      isMock: true
    }),
    disconnect: async () => {
      console.log('Mock Redis disconnect');
    }
  };
}

// Legacy support
export function getRedisClient() {
  return createRedisClient();
}

// Export a direct Redis client instance for convenience
export const redisClient = createRedisClient();

// Export performance monitoring
export function getRedisMetrics() {
  const client = createRedisClient();
  return client.getMetrics();
}

// Redis keys for consistent naming
export const redisKeys = {
  queuePosition: (eventId: string, userId: string) => `queue:${eventId}:${userId}:v2`,
  eventAvailability: (eventId: string) => `availability:${eventId}:v2`,
  userTickets: (userId: string, eventId?: string) => 
    eventId ? `user:${userId}:event:${eventId}:tickets:v3` : `user:${userId}:tickets:v3`,
  queueSize: (eventId: string) => `queue:${eventId}:size:v2`,
  eventDetails: (eventId: string) => `event:${eventId}:details:v2`,
};

// TTL constants
export const REDIS_TTL = {
  QUEUE_POSITION: 60 * 2, // 2 minutes
  EVENT_AVAILABILITY: 60 * 5, // 5 minutes
  USER_TICKETS: 60 * 3, // 3 minutes
  EVENT_DETAILS: 60 * 10, // 10 minutes
  QUEUE_SIZE: 60 * 1, // 1 minute
} as const;
