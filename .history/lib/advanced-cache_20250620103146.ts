// PHASE 2: Advanced Multi-Layer Caching System
import { redisClient } from './redis';

export interface CacheConfig {
  ttl: number;
  staleWhileRevalidate?: number;
  backgroundRefresh?: boolean;
  warmupKeys?: string[];
  compression?: boolean;
}

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  avgResponseTime: number;
  lastUpdated: number;
}

class AdvancedCacheManager {
  private stats: Map<string, CacheStats> = new Map();
  private backgroundTasks: Map<string, NodeJS.Timeout> = new Map();
  
  constructor() {
    // Initialize cache warming on startup
    this.initializeCacheWarming();
  }

  /**
   * PHASE 2: Intelligent caching with stale-while-revalidate
   */
  async get<T>(
    key: string, 
    fetchFn: () => Promise<T>, 
    config: CacheConfig
  ): Promise<T> {
    const startTime = performance.now();
    const fullKey = `advanced:${key}`;
    
    try {
      // Layer 1: Try Redis cache with timeout for concurrent load
      const cachePromise = redisClient.get(fullKey);
      const timeoutPromise = new Promise<string | null>((_, reject) => 
        setTimeout(() => reject(new Error('Cache timeout')), 10000) // 10 second timeout for better reliability
      );
      
      const cached = await Promise.race([cachePromise, timeoutPromise]);
      
      if (cached) {
        const data = JSON.parse(cached);
        const age = Date.now() - data.timestamp;
        
        // Update stats
        this.updateStats(key, true, performance.now() - startTime);
        
        // If stale but within stale-while-revalidate window
        if (age > config.ttl * 1000 && config.staleWhileRevalidate) {
          const staleWindow = config.staleWhileRevalidate * 1000;
          
          if (age < config.ttl * 1000 + staleWindow) {
            // Return stale data but trigger background refresh
            this.backgroundRefresh(key, fetchFn, config);
            console.log(`[ADVANCED CACHE] Serving stale data for ${key} (age: ${age}ms)`);
            return data.value;
          }
        }
        
        // Fresh data
        if (age <= config.ttl * 1000) {
          console.log(`[ADVANCED CACHE] Cache hit for ${key} (age: ${age}ms)`);
          return data.value;
        }
      }
      
      // Cache miss - fetch fresh data
      console.log(`[ADVANCED CACHE] Cache miss for ${key}`);
      const freshData = await fetchFn();
      
      // Store in cache (fire-and-forget to not block response)
      this.set(key, freshData, config).catch(error => 
        console.error(`[ADVANCED CACHE] Async cache set failed for ${key}:`, error)
      );
      
      // Update stats
      this.updateStats(key, false, performance.now() - startTime);
      
      return freshData;
      
    } catch (error) {
      console.error(`[ADVANCED CACHE] Error for key ${key}:`, error);
      
      // Fast fallback: skip stale data lookup on timeout and fetch directly
      if (error.message === 'Cache timeout') {
        console.log(`[ADVANCED CACHE] Cache timeout for ${key}, fetching directly`);
        this.updateStats(key, false, performance.now() - startTime);
        return await fetchFn();
      }
      
      // For other errors, try stale data quickly
      try {
        const stalePromise = redisClient.get(fullKey);
        const quickTimeout = new Promise<string | null>((_, reject) => 
          setTimeout(() => reject(new Error('Stale timeout')), 500) // 500ms timeout for stale
        );
        
        const staleData = await Promise.race([stalePromise, quickTimeout]);
        if (staleData) {
          console.log(`[ADVANCED CACHE] Returning stale data due to error for ${key}`);
          return JSON.parse(staleData).value;
        }
      } catch (staleError) {
        console.error(`[ADVANCED CACHE] No stale data available for ${key}`);
      }
      
      // Last resort: fetch directly
      this.updateStats(key, false, performance.now() - startTime);
      return await fetchFn();
    }
  }

  /**
   * PHASE 2: Set cache with compression and metadata
   */
  async set<T>(key: string, value: T, config: CacheConfig): Promise<void> {
    const fullKey = `advanced:${key}`;
    
    try {
      const cacheData = {
        value,
        timestamp: Date.now(),
        ttl: config.ttl,
        compressed: config.compression || false
      };
      
      let serialized = JSON.stringify(cacheData);
      
      // Optional compression for large objects
      if (config.compression && serialized.length > 1024) {
        // Simple compression placeholder - could use actual compression library
        console.log(`[ADVANCED CACHE] Compressing ${key} (${serialized.length} bytes)`);
      }
      
      // Set with timeout to prevent blocking under load
      const setPromise = redisClient.set(fullKey, serialized, { ex: config.ttl });
      const setTimeoutPromise = new Promise<void>((_, reject) => 
        setTimeout(() => reject(new Error('Set timeout')), 3000) // 3 second timeout for set operations
      );
      
      await Promise.race([setPromise, setTimeoutPromise]);
      
      // Schedule background refresh if enabled
      if (config.backgroundRefresh) {
        this.scheduleBackgroundRefresh(key, config);
      }
      
    } catch (error) {
      console.error(`[ADVANCED CACHE] Failed to set ${key}:`, error);
    }
  }

  /**
   * PHASE 2: Background refresh to keep cache warm
   */
  private backgroundRefresh<T>(
    key: string, 
    fetchFn: () => Promise<T>, 
    config: CacheConfig
  ): void {
    // Prevent multiple background refreshes for the same key
    if (this.backgroundTasks.has(key)) {
      return;
    }
    
    const task = setTimeout(async () => {
      try {
        console.log(`[ADVANCED CACHE] Background refresh for ${key}`);
        const freshData = await fetchFn();
        await this.set(key, freshData, config);
      } catch (error) {
        console.error(`[ADVANCED CACHE] Background refresh failed for ${key}:`, error);
      } finally {
        this.backgroundTasks.delete(key);
      }
    }, 100); // Small delay to avoid blocking
    
    this.backgroundTasks.set(key, task);
  }

  /**
   * PHASE 2: Schedule periodic background refresh
   */
  private scheduleBackgroundRefresh(key: string, config: CacheConfig): void {
    const refreshInterval = config.ttl * 0.8 * 1000; // Refresh at 80% of TTL
    
    const existingTask = this.backgroundTasks.get(`schedule:${key}`);
    if (existingTask) {
      clearInterval(existingTask);
    }
    
    const task = setInterval(() => {
      console.log(`[ADVANCED CACHE] Scheduled refresh triggered for ${key}`);
      // This would need the original fetch function - simplified for now
    }, refreshInterval);
    
    this.backgroundTasks.set(`schedule:${key}`, task);
  }

  /**
   * PHASE 2: Cache warming for critical data
   */
  private async initializeCacheWarming(): Promise<void> {
    console.log('[ADVANCED CACHE] Initializing cache warming...');
    
    // Define critical cache keys to warm up
    const criticalKeys = [
      'popular-events',
      'event-categories',
      'featured-events'
    ];
    
    // Warm up critical caches in background
    setTimeout(async () => {
      for (const key of criticalKeys) {
        try {
          console.log(`[ADVANCED CACHE] Warming up ${key}`);
          // This would call specific warming functions
          await this.warmupKey(key);
        } catch (error) {
          console.error(`[ADVANCED CACHE] Failed to warm ${key}:`, error);
        }
      }
    }, 5000); // Start warming after 5 seconds
  }

  /**
   * PHASE 2: Warm up specific cache key
   */
  private async warmupKey(key: string): Promise<void> {
    // Placeholder for specific warmup logic
    console.log(`[ADVANCED CACHE] Warming up ${key} - implement specific logic`);
  }

  /**
   * PHASE 2: Update cache statistics
   */
  private updateStats(key: string, hit: boolean, responseTime: number): void {
    const existing = this.stats.get(key) || {
      hits: 0,
      misses: 0,
      hitRate: 0,
      avgResponseTime: 0,
      lastUpdated: Date.now()
    };
    
    if (hit) {
      existing.hits++;
    } else {
      existing.misses++;
    }
    
    const total = existing.hits + existing.misses;
    existing.hitRate = (existing.hits / total) * 100;
    existing.avgResponseTime = (existing.avgResponseTime + responseTime) / 2;
    existing.lastUpdated = Date.now();
    
    this.stats.set(key, existing);
  }

  /**
   * PHASE 2: Get cache statistics
   */
  getStats(key?: string): CacheStats | Map<string, CacheStats> {
    if (key) {
      return this.stats.get(key) || {
        hits: 0,
        misses: 0,
        hitRate: 0,
        avgResponseTime: 0,
        lastUpdated: 0
      };
    }
    return this.stats;
  }

  /**
   * PHASE 2: Batch invalidation
   */
  async invalidatePattern(pattern: string): Promise<number> {
    try {
      // Our Redis client doesn't expose keys() method for security/performance reasons
      // For now, we'll implement individual key invalidation
      console.log(`[ADVANCED CACHE] Pattern invalidation requested for ${pattern} (limited implementation)`);
      
      // Clear local stats for matching patterns
      let invalidatedCount = 0;
      for (const [key, stats] of this.stats.entries()) {
        if (key.includes(pattern)) {
          this.stats.delete(key);
          invalidatedCount++;
        }
      }
      
      console.log(`[ADVANCED CACHE] Invalidated ${invalidatedCount} local stats for pattern ${pattern}`);
      return invalidatedCount;
    } catch (error) {
      console.error(`[ADVANCED CACHE] Failed to invalidate pattern ${pattern}:`, error);
      return 0;
    }
  }

  /**
   * PHASE 2: Cleanup expired background tasks
   */
  cleanup(): void {
    for (const [key, task] of this.backgroundTasks.entries()) {
      clearTimeout(task);
      clearInterval(task);
    }
    this.backgroundTasks.clear();
    console.log('[ADVANCED CACHE] Cleaned up background tasks');
  }
}

// Export singleton instance
export const advancedCache = new AdvancedCacheManager();

// Export helper functions for common use cases
export const withAdvancedCache = <T>(
  key: string,
  fetchFn: () => Promise<T>,
  config: CacheConfig
): Promise<T> => {
  return advancedCache.get(key, fetchFn, config);
};

// Fast cache for high-concurrency scenarios
export const withFastCache = async <T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttl: number = 60
): Promise<T> => {
  const fullKey = `fast:${key}`;
  
  try {
    // Quick cache check with very short timeout
    const cachePromise = redisClient.get(fullKey);
    const timeoutPromise = new Promise<string | null>((_, reject) => 
      setTimeout(() => reject(new Error('Fast cache timeout')), 500) // 500ms timeout
    );
    
    const cached = await Promise.race([cachePromise, timeoutPromise]);
    
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (error) {
    // On any cache error, skip cache and fetch directly
    console.log(`[FAST CACHE] Cache error for ${key}, fetching directly`);
  }
  
  // Fetch data
  const data = await fetchFn();
  
  // Set cache in background (fire-and-forget)
  redisClient.set(fullKey, JSON.stringify(data), { ex: ttl }).catch(() => {
    // Ignore cache set errors in fast mode
  });
  
  return data;
};

// Predefined cache configurations
export const CACHE_CONFIGS = {
  // User data - short TTL with stale-while-revalidate
  USER_DATA: {
    ttl: 60, // 1 minute
    staleWhileRevalidate: 300, // 5 minutes stale window
    backgroundRefresh: true
  } as CacheConfig,
  
  // Event data - medium TTL with background refresh
  EVENT_DATA: {
    ttl: 300, // 5 minutes
    staleWhileRevalidate: 600, // 10 minutes stale window
    backgroundRefresh: true,
    compression: true
  } as CacheConfig,
  
  // Static content - long TTL
  STATIC_CONTENT: {
    ttl: 3600, // 1 hour
    compression: true
  } as CacheConfig,
  
  // Real-time data - very short TTL
  REALTIME_DATA: {
    ttl: 30, // 30 seconds
    staleWhileRevalidate: 60, // 1 minute stale window
    backgroundRefresh: true
  } as CacheConfig
}; 