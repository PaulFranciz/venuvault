#!/usr/bin/env node

/**
 * Test script for cron API endpoints
 * This script tests all three cron endpoints with the proper authentication
 */

import { config } from 'dotenv';

// Load environment variables
config();

const BASE_URL = 'https://ticwaka.vercel.app';
const API_SECRET_TOKEN = process.env.API_SECRET_TOKEN;

const ENDPOINTS = [
  '/api/cron/process-queues',
  '/api/cron/cleanup-reservations', 
  '/api/cron/process-waitlist'
];

async function testEndpoint(endpoint) {
  const url = `${BASE_URL}${endpoint}`;
  
  console.log(`\n🧪 Testing ${endpoint}...`);
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_SECRET_TOKEN}`,
        'x-api-key': API_SECRET_TOKEN
      }
    });
    
    const text = await response.text();
    let data;
    
    try {
      data = JSON.parse(text);
    } catch {
      data = { rawResponse: text };
    }
    
    if (response.ok) {
      console.log(`✅ ${endpoint} - SUCCESS (${response.status})`);
      console.log(`   Response:`, JSON.stringify(data, null, 2));
    } else {
      console.log(`❌ ${endpoint} - FAILED (${response.status})`);
      console.log(`   Error:`, JSON.stringify(data, null, 2));
    }
    
    return { endpoint, success: response.ok, status: response.status, data };
  } catch (error) {
    console.log(`❌ ${endpoint} - ERROR: ${error.message}`);
    return { endpoint, success: false, error: error.message };
  }
}

async function testAllEndpoints() {
  console.log('🚀 Testing Cron API Endpoints');
  console.log('==============================');
  
  if (!API_SECRET_TOKEN) {
    console.log('❌ API_SECRET_TOKEN environment variable is not set');
    console.log('💡 Make sure to set API_SECRET_TOKEN in your .env file');
    process.exit(1);
  }
  
  console.log(`🔑 Using API token: ${API_SECRET_TOKEN.substring(0, 8)}...`);
  console.log(`🌐 Testing against: ${BASE_URL}`);
  
  const results = [];
  
  for (const endpoint of ENDPOINTS) {
    const result = await testEndpoint(endpoint);
    results.push(result);
    
    // Add delay between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n📊 Summary:');
  console.log('============');
  
  const successful = results.filter(r => r.success).length;
  const total = results.length;
  
  console.log(`✅ Successful: ${successful}/${total}`);
  console.log(`❌ Failed: ${total - successful}/${total}`);
  
  if (successful === total) {
    console.log('\n🎉 All endpoints are working correctly!');
  } else {
    console.log('\n⚠️  Some endpoints are failing. Check the errors above.');
  }
  
  results.forEach(result => {
    if (!result.success) {
      console.log(`   - ${result.endpoint}: ${result.error || `HTTP ${result.status}`}`);
    }
  });
}

// Run the tests
testAllEndpoints().catch(error => {
  console.error('💥 Test script error:', error);
  process.exit(1);
}); 