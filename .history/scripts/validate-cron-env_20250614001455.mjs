#!/usr/bin/env node

/**
 * Environment validation script for cron jobs
 * This script validates that all required environment variables are properly set
 */

import { config } from 'dotenv';

// Load environment variables
config();

const REQUIRED_ENV_VARS = [
  'API_SECRET_TOKEN',
  'NEXT_PUBLIC_CONVEX_URL',
];

const OPTIONAL_ENV_VARS = [
  'REDIS_URL',
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
    console.log('\n💡 Action items:');
    console.log('   1. Set missing variables in your .env file (for local testing)');
    console.log('   2. Set missing variables in Vercel project settings');
    console.log('   3. Set API_SECRET_TOKEN in GitHub repository secrets');
    process.exit(1);
  }
  
  console.log('\n✅ All required environment variables are present!');
  
  // Validate token format
  if (process.env.API_SECRET_TOKEN) {
    const token = process.env.API_SECRET_TOKEN;
    if (token.length < 20) {
      console.log('\n⚠️  API_SECRET_TOKEN seems short - consider using a stronger token');
      console.log('   Generate one with: openssl rand -base64 32');
    } else {
      console.log('\n🔐 API_SECRET_TOKEN appears to be properly formatted');
    }
  }
  
  // Validate Convex URL format
  if (process.env.NEXT_PUBLIC_CONVEX_URL) {
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (convexUrl.includes('convex.cloud')) {
      console.log('🌐 NEXT_PUBLIC_CONVEX_URL appears to be a valid Convex URL');
    } else {
      console.log('⚠️  NEXT_PUBLIC_CONVEX_URL format may be incorrect');
      console.log('   Expected format: https://your-project.convex.cloud');
    }
  }
  
  return allValid;
}

console.log('🚀 Cron Jobs Environment Validation');
console.log('====================================');

// Run validation
try {
  const isValid = validateEnvVars();
  if (isValid) {
    console.log('\n🎉 Environment validation passed!');
    console.log('\n📋 Next steps:');
    console.log('   1. Test endpoints: node scripts/test-cron-endpoints.mjs');
    console.log('   2. Manual GitHub Actions test');
    console.log('   3. Check Vercel function logs');
  }
} catch (error) {
  console.error('💥 Validation script error:', error.message);
  process.exit(1);
} 