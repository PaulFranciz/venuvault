#!/usr/bin/env node

/**
 * Phase 1 Optimization Test Suite
 * Tests all critical performance fixes and improvements
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000';
const TEST_EVENT_ID = 'jh716mjrw1nd9cven9w80k760s7j4a9j';
const TEST_USER_ID = 'user_2vIL4uwniO0WzDdyaAQ6CdjVW4V';

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  bold: '\x1b[1m',
  reset: '\x1b[0m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  bold: (msg) => console.log(`${colors.bold}${msg}${colors.reset}`)
};

// Performance targets for Phase 1
const PERFORMANCE_TARGETS = {
  userTickets: 800, // 800ms target (down from 1500ms+)
  queuePosition: 1000, // 1000ms target (down from server busy errors)
  eventAvailability: 1500, // 1500ms target (down from 2000ms+)
  eventDetails: 1000, // 1000ms target (down from 1500ms+)
  redisHealth: 200 // 200ms target for Redis operations
};

// Test individual API performance
async function testApiPerformance(name, url, targetMs) {
  const startTime = performance.now();
  
  try {
    const response = await fetch(`${BASE_URL}${url}`, {
      signal: AbortSignal.timeout(10000)
    });
    
    const endTime = performance.now();
    const duration = Math.round(endTime - startTime);
    const dataSource = response.headers.get('X-Data-Source') || 'unknown';
    const responseTime = response.headers.get('X-Response-Time') || 'unknown';
    
    const isWithinTarget = duration <= targetMs;
    const status = response.ok ? 'OK' : `ERROR (${response.status})`;
    
    if (response.ok && isWithinTarget) {
      log.success(`${name}: ${status} (${duration}ms/${targetMs}ms) - ${dataSource}`);
    } else if (response.ok && !isWithinTarget) {
      log.warning(`${name}: ${status} (${duration}ms/${targetMs}ms) - SLOW - ${dataSource}`);
    } else {
      log.error(`${name}: ${status} (${duration}ms) - ${dataSource}`);
    }
    
    return {
      name,
      success: response.ok,
      duration,
      withinTarget: isWithinTarget,
      dataSource,
      responseTime
    };
    
  } catch (error) {
    const endTime = performance.now();
    const duration = Math.round(endTime - startTime);
    
    log.error(`${name}: FAILED (${duration}ms) - ${error.message}`);
    return {
      name,
      success: false,
      duration,
      withinTarget: false,
      error: error.message
    };
  }
}

// Test concurrent load to validate stability
async function testConcurrentLoad(name, url, concurrent = 5, iterations = 3) {
  log.info(`Testing ${name} under load (${concurrent}x${iterations})...`);
  
  const promises = [];
  const results = [];
  
  for (let i = 0; i < concurrent; i++) {
    for (let j = 0; j < iterations; j++) {
      promises.push(
        (async () => {
          const startTime = performance.now();
          try {
            const response = await fetch(`${BASE_URL}${url}`, {
              signal: AbortSignal.timeout(15000)
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
  const minDuration = Math.min(...results.map(r => r.duration));
  
  const successRate = (successful / results.length * 100).toFixed(1);
  
  if (successRate >= 95) {
    log.success(`${name} Load Test: ${successRate}% success (${successful}/${results.length})`);
  } else if (successRate >= 90) {
    log.warning(`${name} Load Test: ${successRate}% success (${successful}/${results.length})`);
  } else {
    log.error(`${name} Load Test: ${successRate}% success (${successful}/${results.length})`);
  }
  
  console.log(`   Performance: avg=${Math.round(avgDuration)}ms, min=${Math.round(minDuration)}ms, max=${Math.round(maxDuration)}ms`);
  
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
  
  return {
    name,
    successRate: parseFloat(successRate),
    avgDuration: Math.round(avgDuration),
    maxDuration: Math.round(maxDuration),
    minDuration: Math.round(minDuration),
    dataSources
  };
}

// Test Redis performance specifically
async function testRedisPerformance() {
  try {
    const response = await fetch(`${BASE_URL}/api/admin/performance-metrics`, {
      signal: AbortSignal.timeout(5000)
    });
    
    if (response.ok) {
      const data = await response.json();
      const redis = data.redis;
      
      if (redis.isMock) {
        log.warning('Redis: Using mock client (circuit breaker open)');
        return false;
      }
      
      const successRate = parseFloat(redis.successRate);
      const avgResponseTime = redis.averageResponseTime;
      const poolSize = redis.poolSize;
      
      if (successRate >= 95 && avgResponseTime <= 100 && poolSize > 0) {
        log.success(`Redis: ${successRate}% success, ${avgResponseTime.toFixed(1)}ms avg, ${poolSize} connections`);
        return true;
      } else {
        log.warning(`Redis: ${successRate}% success, ${avgResponseTime.toFixed(1)}ms avg, ${poolSize} connections`);
        return false;
      }
    } else {
      log.error('Redis: Performance metrics endpoint failed');
      return false;
    }
  } catch (error) {
    log.error(`Redis: ${error.message}`);
    return false;
  }
}

// Main test runner
async function runPhase1Tests() {
  log.bold('\n🚀 Phase 1 Optimization Test Suite');
  log.bold('=====================================\n');
  
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Test Event ID: ${TEST_EVENT_ID}`);
  console.log(`Test User ID: ${TEST_USER_ID}\n`);
  
  // Test 1: Individual API Performance
  log.bold('1. API Performance Tests');
  const apiTests = [
    { name: 'User Tickets API', url: `/api/users/${TEST_USER_ID}/tickets?eventId=${TEST_EVENT_ID}`, target: PERFORMANCE_TARGETS.userTickets },
    { name: 'Queue Position API', url: `/api/queue/position?eventId=${TEST_EVENT_ID}&userId=${TEST_USER_ID}`, target: PERFORMANCE_TARGETS.queuePosition },
    { name: 'Event Availability API', url: `/api/events/${TEST_EVENT_ID}/availability`, target: PERFORMANCE_TARGETS.eventAvailability },
    { name: 'Event Details API', url: `/api/events/${TEST_EVENT_ID}`, target: PERFORMANCE_TARGETS.eventDetails }
  ];
  
  const apiResults = [];
  for (const test of apiTests) {
    const result = await testApiPerformance(test.name, test.url, test.target);
    apiResults.push(result);
    await new Promise(resolve => setTimeout(resolve, 100)); // Small delay between tests
  }
  
  // Test 2: System Health
  log.bold('\n2. System Health Tests');
  const redisHealthy = await testRedisPerformance();
  
  // Test 3: Load Testing
  log.bold('\n3. Load Testing');
  const loadResults = [];
  for (const test of apiTests) {
    const result = await testConcurrentLoad(test.name, test.url, 3, 2); // Lighter load for testing
    loadResults.push(result);
    await new Promise(resolve => setTimeout(resolve, 500)); // Delay between load tests
  }
  
  // Test 4: Overall Analysis
  log.bold('\n4. Phase 1 Optimization Analysis');
  
  const passedApis = apiResults.filter(r => r.success && r.withinTarget).length;
  const totalApis = apiResults.length;
  const passedLoad = loadResults.filter(r => r.successRate >= 95).length;
  
  console.log(`\nAPI Performance: ${passedApis}/${totalApis} APIs within target`);
  console.log(`Load Testing: ${passedLoad}/${loadResults.length} APIs passed load test`);
  console.log(`Redis Health: ${redisHealthy ? 'Healthy' : 'Issues detected'}`);
  
  // Final verdict
  const overallPass = passedApis >= totalApis * 0.75 && passedLoad >= loadResults.length * 0.75 && redisHealthy;
  
  if (overallPass) {
    log.success('\n🎉 Phase 1 Optimizations: PASSED - Ready for Phase 2!');
  } else {
    log.warning('\n⚠️  Phase 1 Optimizations: NEEDS IMPROVEMENT - Address issues before Phase 2');
  }
  
  // Recommendations
  log.bold('\n5. Recommendations for Phase 2');
  console.log('- Implement query optimization for faster Convex responses');
  console.log('- Add CDN caching for static content');
  console.log('- Implement server-side caching layers');
  console.log('- Add real-time performance monitoring');
  console.log('- Optimize database queries and indexing');
  
  return {
    apiResults,
    loadResults,
    redisHealthy,
    overallPass
  };
}

// Run tests
runPhase1Tests().catch(console.error); 