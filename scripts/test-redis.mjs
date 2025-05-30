#!/usr/bin/env node
/**
 * Test script for Redis connection
 * Run with: node scripts/test-redis.mjs
 */

import { Redis } from '@upstash/redis';
import IORedis from 'ioredis';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables from .env.local
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env.local') });

async function testRedisConnection() {
  console.log('Testing Redis connection...');
  
  try {
    // Test Upstash Redis HTTP client
    console.log('Testing Upstash Redis HTTP client...');
    const upstashRedis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
    
    // Set a test value
    await upstashRedis.set('test_key', { message: 'Hello from Upstash Redis', timestamp: Date.now() });
    
    // Get the test value
    const result = await upstashRedis.get('test_key');
    console.log('Upstash Redis test result:', result);
    
    // Test IORedis client
    console.log('\nTesting IORedis client...');
    const ioredis = new IORedis(process.env.REDIS_URL, {
      tls: { rejectUnauthorized: false },
    });
    
    // Set a test value
    await ioredis.set('test_key_ioredis', JSON.stringify({ 
      message: 'Hello from IORedis', 
      timestamp: Date.now() 
    }));
    
    // Get the test value
    const ioredisResult = await ioredis.get('test_key_ioredis');
    console.log('IORedis test result:', JSON.parse(ioredisResult));
    
    // Clean up
    await upstashRedis.del('test_key');
    await ioredis.del('test_key_ioredis');
    await ioredis.quit();
    
    console.log('\n✅ Redis connection test successful!');
  } catch (error) {
    console.error('\n❌ Redis connection test failed:', error);
  }
}

// Run the test
testRedisConnection();
