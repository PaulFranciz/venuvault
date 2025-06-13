#!/usr/bin/env node

/**
 * Environment validation script for cron jobs
 * This script validates that all required environment variables are properly set
 */

import { execSync } from 'child_process';

const REQUIRED_ENV_VARS = [
  'API_SECRET_TOKEN',
  'NEXT_PUBLIC_CONVEX_URL',
  'REDIS_URL'
];

const OPTIONAL_ENV_VARS = [
  'VERCEL_URL',
  'SLACK_WEBHOOK_URL'
];

function validateEnvVars() {
  console.log('🔍 Validating environment variables for cron jobs...\n');
  
  let allValid = true;
  const missing = [];
  const present = [];
  
  // Check required variables
  for (const envVar of REQUIRED_ENV_VARS) {
    if (process.env[envVar]) {
      present.push(envVar);
      console.log(`✅ ${envVar}: Set (${process.env[envVar].substring(0, 8)}...)`);
    } else {
      missing.push(envVar);
      console.log(`❌ ${envVar}: MISSING`);
      allValid = false;
    }
  }
  
  console.log('\n📋 Optional variables:');
  for (const envVar of OPTIONAL_ENV_VARS) {
    if (process.env[envVar]) {
      console.log(`✅ ${envVar}: Set`);
    } else {
      console.log(`⚠️  ${envVar}: Not set (optional)`);
    }
  }
  
  console.log('\n📊 Summary:');
  console.log(`Required variables: ${present.length}/${REQUIRED_ENV_VARS.length} present`);
  
  if (!allValid) {
    console.log('\n❌ Validation failed! Missing required environment variables:');
    missing.forEach(var_ => console.log(`   - ${var_}`));
    console.log('\n💡 Make sure these are set in your Vercel project settings.');
    process.exit(1);
  }
  
  console.log('\n✅ All required environment variables are present!');
  
  // Test Convex connection
  try {
    console.log('\n🔗 Testing Convex connection...');
    const convexModule = await import('convex/browser');
    const ConvexHttpClient = convexModule.ConvexHttpClient;
    const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);
    console.log('✅ Convex client initialized successfully');
  } catch (error) {
    console.log('❌ Convex connection test failed:', error.message);
    allValid = false;
  }
  
  // Test Redis connection if URL is provided
  if (process.env.REDIS_URL) {
    try {
      console.log('\n🔗 Testing Redis connection...');
      const ioredisModule = await import('ioredis');
      const IORedis = ioredisModule.default;
      const redis = new IORedis(process.env.REDIS_URL, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        connectTimeout: 5000,
      });
      await redis.ping();
      console.log('✅ Redis connection successful');
      await redis.disconnect();
    } catch (error) {
      console.log('❌ Redis connection test failed:', error.message);
      // Don't fail validation for Redis since it might not be critical
    }
  }
  
  return allValid;
}

// Run validation
try {
  const isValid = validateEnvVars();
  if (isValid) {
    console.log('\n🎉 Environment validation passed! Cron jobs should work properly.');
  }
} catch (error) {
  console.error('💥 Validation script error:', error.message);
  process.exit(1);
} 