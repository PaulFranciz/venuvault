#!/usr/bin/env node

/**
 * Comprehensive API Health Testing Script
 * Tests all critical endpoints and provides detailed diagnostics
 */

import fetch from 'node-fetch';
import { performance } from 'perf_hooks';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const TEST_EVENT_ID = process.env.TEST_EVENT_ID || 'jh716mjrw1nd9cven9w80k760s7j4a9j';
const TEST_USER_ID = process.env.TEST_USER_ID || 'user_2vIL4uwniO0WzDdyaAQ6CdjVW4V';

// Color console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  bold: (msg) => console.log(`${colors.bold}${msg}${colors.reset}`)
};

// Test configuration
const ENDPOINTS = [
  {
    name: 'Event Availability',
    url: `/api/events/${TEST_EVENT_ID}/availability`,
    method: 'GET',
    timeout: 10000,
    expectedStatus: 200,
    checkResponse: (data) => data.hasOwnProperty('isSoldOut') || data.hasOwnProperty('isMockData')
  },
  {
    name: 'Queue Position',
    url: `/api/queue/position?eventId=${TEST_EVENT_ID}&userId=${TEST_USER_ID}`,
    method: 'GET',
    timeout: 10000,
    expectedStatus: 200,
    checkResponse: (data) => {
      // Allow null response for no queue position
      if (data === null || data === undefined) return true;
      return data.hasOwnProperty('position') || data.hasOwnProperty('error') || data.hasOwnProperty('isInQueue');
    }
  },
  {
    name: 'Event Details',
    url: `/api/events/${TEST_EVENT_ID}`,
    method: 'GET',
    timeout: 8000,
    expectedStatus: 200,
    checkResponse: (data) => data.hasOwnProperty('name') || data.hasOwnProperty('_id')
  },
  {
    name: 'User Tickets',
    url: `/api/users/${TEST_USER_ID}/tickets?eventId=${TEST_EVENT_ID}`,
    method: 'GET',
    timeout: 8000,
    expectedStatus: 200,
    checkResponse: (data) => {
      // Allow null response for no tickets
      if (data === null || data === undefined) return true;
      return Array.isArray(data) || data.hasOwnProperty('tickets') || data.hasOwnProperty('error');
    }
  }
];

// Enhanced test function with detailed diagnostics
async function testEndpoint(endpoint) {
  const startTime = performance.now();
  const url = `${BASE_URL}${endpoint.url}`;
  
  try {
    log.info(`Testing ${endpoint.name}...`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), endpoint.timeout);
    
    const response = await fetch(url, {
      method: endpoint.method,
      signal: controller.signal,
      headers: {
        'User-Agent': 'API-Health-Test/1.0'
      }
    });
    
    clearTimeout(timeoutId);
    const endTime = performance.now();
    const duration = Math.round(endTime - startTime);
    
    // Check status code
    if (response.status !== endpoint.expectedStatus) {
      log.error(`${endpoint.name}: Expected status ${endpoint.expectedStatus}, got ${response.status} (${duration}ms)`);
      const errorText = await response.text();
      console.log(`   Response: ${errorText.substring(0, 200)}...`);
      return false;
    }
    
    // Check response content
    const data = await response.json();
    const dataSource = response.headers.get('X-Data-Source') || 'unknown';
    
    if (endpoint.checkResponse && !endpoint.checkResponse(data)) {
      log.error(`${endpoint.name}: Invalid response structure (${duration}ms)`);
      console.log(`   Response: ${JSON.stringify(data).substring(0, 200)}...`);
      return false;
    }
    
    // Success with diagnostics
    log.success(`${endpoint.name}: OK (${duration}ms, source: ${dataSource})`);
    
    // Additional warnings for performance or data source
    if (duration > 5000) {
      log.warning(`${endpoint.name}: Slow response (${duration}ms)`);
    }
    
    if (dataSource.includes('mock')) {
      log.warning(`${endpoint.name}: Using mock data`);
    }
    
    if (dataSource.includes('fallback')) {
      log.warning(`${endpoint.name}: Using fallback response`);
    }
    
    return true;
    
  } catch (error) {
    const endTime = performance.now();
    const duration = Math.round(endTime - startTime);
    
    if (error.name === 'AbortError') {
      log.error(`${endpoint.name}: Timeout after ${endpoint.timeout}ms`);
    } else {
      log.error(`${endpoint.name}: ${error.message} (${duration}ms)`);
    }
    
    return false;
  }
}

// Test Redis health
async function testRedisHealth() {
  try {
    const response = await fetch(`${BASE_URL}/api/health/redis`, {
      timeout: 5000
    });
    
    if (response.ok) {
      const data = await response.json();
      log.success(`Redis: ${data.status || 'Connected'}`);
      return true;
    } else {
      log.error('Redis: Health check failed');
      return false;
    }
  } catch (error) {
    log.warning('Redis: Health check endpoint not available');
    return false;
  }
}

// Load testing function
async function loadTest(endpoint, concurrent = 5, iterations = 3) {
  log.info(`Load testing ${endpoint.name} (${concurrent} concurrent, ${iterations} iterations)...`);
  
  const promises = [];
  const results = [];
  
  for (let i = 0; i < concurrent; i++) {
    for (let j = 0; j < iterations; j++) {
      promises.push(
        (async () => {
          const startTime = performance.now();
          try {
            const response = await fetch(`${BASE_URL}${endpoint.url}`, {
              method: endpoint.method,
              timeout: endpoint.timeout
            });
            const endTime = performance.now();
            const duration = endTime - startTime;
            
            results.push({
              success: response.ok,
              status: response.status,
              duration: duration,
              dataSource: response.headers.get('X-Data-Source')
            });
          } catch (error) {
            const endTime = performance.now();
            results.push({
              success: false,
              error: error.message,
              duration: endTime - startTime
            });
          }
        })()
      );
    }
  }
  
  await Promise.all(promises);
  
  // Analyze results
  const successful = results.filter(r => r.success).length;
  const failed = results.length - successful;
  const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
  const maxDuration = Math.max(...results.map(r => r.duration));
  
  if (successful === results.length) {
    log.success(`${endpoint.name} Load Test: ${successful}/${results.length} passed (avg: ${Math.round(avgDuration)}ms, max: ${Math.round(maxDuration)}ms)`);
  } else {
    log.error(`${endpoint.name} Load Test: ${successful}/${results.length} passed, ${failed} failed (avg: ${Math.round(avgDuration)}ms)`);
  }
  
  // Show data source distribution
  const dataSources = {};
  results.forEach(r => {
    if (r.dataSource) {
      dataSources[r.dataSource] = (dataSources[r.dataSource] || 0) + 1;
    }
  });
  
  if (Object.keys(dataSources).length > 0) {
    console.log(`   Data sources: ${JSON.stringify(dataSources)}`);
  }
  
  return successful === results.length;
}

// Main test runner
async function runTests() {
  log.bold('\n🧪 API Health Test Suite');
  log.bold('================================\n');
  
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Test Event ID: ${TEST_EVENT_ID}`);
  console.log(`Test User ID: ${TEST_USER_ID}\n`);
  
  let totalTests = 0;
  let passedTests = 0;
  
  // Test Redis health first
  log.bold('Health Checks:');
  if (await testRedisHealth()) {
    passedTests++;
  }
  totalTests++;
  
  console.log();
  
  // Test each endpoint
  log.bold('Endpoint Tests:');
  for (const endpoint of ENDPOINTS) {
    if (await testEndpoint(endpoint)) {
      passedTests++;
    }
    totalTests++;
  }
  
  console.log();
  
  // Load testing (optional)
  if (process.argv.includes('--load-test')) {
    log.bold('Load Tests:');
    for (const endpoint of ENDPOINTS.slice(0, 2)) { // Test first 2 endpoints
      if (await loadTest(endpoint)) {
        passedTests++;
      }
      totalTests++;
    }
    console.log();
  }
  
  // Summary
  log.bold('Test Results:');
  if (passedTests === totalTests) {
    log.success(`All tests passed (${passedTests}/${totalTests})`);
    process.exit(0);
  } else {
    log.error(`${totalTests - passedTests} tests failed (${passedTests}/${totalTests} passed)`);
    process.exit(1);
  }
}

// Handle command line arguments
if (process.argv.includes('--help')) {
  console.log(`
API Health Test Suite

Usage: node test-api-health.mjs [options]

Options:
  --load-test    Run load tests in addition to health checks
  --help         Show this help message

Environment Variables:
  TEST_BASE_URL    Base URL for testing (default: http://localhost:3000)
  TEST_EVENT_ID    Event ID for testing (default: jh716mjrw1nd9cven9w80k760s7j4a9j)
  TEST_USER_ID     User ID for testing (default: user_2vIL4uwniO0WzDdyaAQ6CdjVW4V)
`);
  process.exit(0);
}

// Run the tests
runTests().catch(error => {
  log.error(`Test suite failed: ${error.message}`);
  process.exit(1);
}); 