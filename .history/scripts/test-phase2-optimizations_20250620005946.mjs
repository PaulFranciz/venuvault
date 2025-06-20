#!/usr/bin/env node

// PHASE 2: Advanced Optimization Testing Suite
import { performance } from 'perf_hooks';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL || 'https://silent-mallard-468.convex.cloud';

// Test configuration
const TEST_CONFIG = {
  CONCURRENT_REQUESTS: 5,
  ITERATIONS: 5, // Increased to 5 to better average out cold starts
  TIMEOUT: 10000,
  
  // Performance targets for Phase 2
  TARGETS: {
    USER_TICKETS_API: 500,    // Reduced from 836ms to 500ms target
    QUEUE_POSITION_API: 400,  // Maintain excellent performance
    EVENT_AVAILABILITY_API: 300, // Maintain excellent performance  
    EVENT_DETAILS_API: 300,   // Maintain excellent performance
    CACHE_HIT_RATE: 85,       // Target 85%+ cache hit rate
    SYSTEM_HEALTH_SCORE: 80   // Target 80+ health score
  }
};

const TEST_USER_ID = 'user_2pqO7VCRBqL8HZwYGJCvQ8fY9mK';
const TEST_EVENT_ID = 'jh716mjrw1nd9cven9w80k760s7j4a9j'; // Fixed: Using correct event ID that exists

console.log('🚀 PHASE 2: Advanced Optimization Testing Suite');
console.log('='.repeat(60));
console.log(`Target Performance Goals:`);
console.log(`  - User Tickets API: <${TEST_CONFIG.TARGETS.USER_TICKETS_API}ms`);
console.log(`  - Queue Position API: <${TEST_CONFIG.TARGETS.QUEUE_POSITION_API}ms`);
console.log(`  - Event Availability API: <${TEST_CONFIG.TARGETS.EVENT_AVAILABILITY_API}ms`);
console.log(`  - Event Details API: <${TEST_CONFIG.TARGETS.EVENT_DETAILS_API}ms`);
console.log(`  - Cache Hit Rate: >${TEST_CONFIG.TARGETS.CACHE_HIT_RATE}%`);
console.log(`  - System Health Score: >${TEST_CONFIG.TARGETS.SYSTEM_HEALTH_SCORE}`);
console.log('='.repeat(60));

/**
 * PHASE 2 TEST 1: Advanced Query Optimization
 */
async function testAdvancedQueryOptimization() {
  console.log('\n🔍 Test 1: Advanced Query Optimization Validation');
  console.log('-'.repeat(50));
  
  const results = {
    userTicketsAPI: [],
    convexOptimized: [],
    batchProcessing: []
  };
  
  try {
    // Test 1a: Optimized User Tickets API
    console.log('Testing optimized User Tickets API...');
    for (let i = 0; i < TEST_CONFIG.ITERATIONS; i++) {
      const startTime = performance.now();
      
      const response = await fetch(`${BASE_URL}/api/users/${TEST_USER_ID}/tickets`, {
        signal: AbortSignal.timeout(TEST_CONFIG.TIMEOUT)
      });
      
      const duration = Math.round(performance.now() - startTime);
      const data = await response.json();
      
      results.userTicketsAPI.push({
        iteration: i + 1,
        duration,
        status: response.status,
        success: response.ok,
        ticketCount: Array.isArray(data) ? data.length : (data.tickets?.length || 0),
        cacheSource: response.headers.get('X-Data-Source'),
        responseTime: response.headers.get('X-Response-Time')
      });
      
      console.log(`  Iteration ${i + 1}: ${duration}ms (${response.status}) - Cache: ${response.headers.get('X-Data-Source')}`);
    }
    
    // Test 1b: Direct Convex Optimized Query
    console.log('\nTesting direct Convex optimized query...');
    for (let i = 0; i < TEST_CONFIG.ITERATIONS; i++) {
      const startTime = performance.now();
      
      const response = await fetch(`${CONVEX_URL}/api/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: 'events:getUserTickets',
          args: { userId: TEST_USER_ID }
        }),
        signal: AbortSignal.timeout(TEST_CONFIG.TIMEOUT)
      });
      
      const duration = Math.round(performance.now() - startTime);
      const data = await response.json();
      const tickets = data.status === 'success' ? data.value : data;
      
      results.convexOptimized.push({
        iteration: i + 1,
        duration,
        status: response.status,
        success: response.ok,
        ticketCount: Array.isArray(tickets) ? tickets.length : 0
      });
      
      console.log(`  Convex Iteration ${i + 1}: ${duration}ms (${response.status})`);
    }
    
    // Calculate averages
    const avgUserTicketsAPI = results.userTicketsAPI.reduce((sum, r) => sum + r.duration, 0) / results.userTicketsAPI.length;
    const avgConvexOptimized = results.convexOptimized.reduce((sum, r) => sum + r.duration, 0) / results.convexOptimized.length;
    
    console.log(`\n📊 Query Optimization Results:`);
    console.log(`  User Tickets API: ${Math.round(avgUserTicketsAPI)}ms avg (Target: <${TEST_CONFIG.TARGETS.USER_TICKETS_API}ms)`);
    console.log(`  Convex Optimized: ${Math.round(avgConvexOptimized)}ms avg`);
    console.log(`  Improvement: ${avgUserTicketsAPI < TEST_CONFIG.TARGETS.USER_TICKETS_API ? '✅ TARGET MET' : '❌ NEEDS WORK'}`);
    
    return {
      success: avgUserTicketsAPI < TEST_CONFIG.TARGETS.USER_TICKETS_API,
      avgUserTicketsAPI: Math.round(avgUserTicketsAPI),
      avgConvexOptimized: Math.round(avgConvexOptimized),
      results
    };
    
  } catch (error) {
    console.error('❌ Query optimization test failed:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * PHASE 2 TEST 2: Advanced Caching System Validation
 */
async function testAdvancedCaching() {
  console.log('\n🗄️ Test 2: Advanced Caching System Validation');
  console.log('-'.repeat(50));
  
  const results = {
    cacheHits: 0,
    cacheMisses: 0,
    staleServed: 0,
    backgroundRefreshes: 0,
    responseTimes: []
  };
  
  try {
    // Test 2a: Cache warming and hit rate
    console.log('Testing cache warming and hit rates...');
    
    // First request (should be cache miss)
    const firstResponse = await fetch(`${BASE_URL}/api/users/${TEST_USER_ID}/tickets`);
    const firstCacheSource = firstResponse.headers.get('X-Data-Source');
    console.log(`  First request: ${firstCacheSource} (expected: cache miss)`);
    
    if (firstCacheSource && firstCacheSource.includes('cached')) {
      results.cacheHits++;
    } else {
      results.cacheMisses++;
    }
    
    // Wait a moment for cache to be set
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Subsequent requests (should be cache hits)
    for (let i = 0; i < 5; i++) {
      const startTime = performance.now();
      const response = await fetch(`${BASE_URL}/api/users/${TEST_USER_ID}/tickets`);
      const duration = Math.round(performance.now() - startTime);
      const cacheSource = response.headers.get('X-Data-Source');
      
      results.responseTimes.push(duration);
      
      if (cacheSource && cacheSource.includes('cached')) {
        results.cacheHits++;
        console.log(`  Request ${i + 2}: ${duration}ms - ✅ Cache Hit (${cacheSource})`);
      } else {
        results.cacheMisses++;
        console.log(`  Request ${i + 2}: ${duration}ms - ❌ Cache Miss (${cacheSource})`);
      }
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    // Test 2b: Different event (should be separate cache)
    console.log('\nTesting event-specific caching...');
    const eventResponse = await fetch(`${BASE_URL}/api/users/${TEST_USER_ID}/tickets?eventId=${TEST_EVENT_ID}`);
    const eventCacheSource = eventResponse.headers.get('X-Data-Source');
    console.log(`  Event-specific request: ${eventCacheSource}`);
    
    // Calculate cache hit rate
    const totalRequests = results.cacheHits + results.cacheMisses;
    const hitRate = totalRequests > 0 ? (results.cacheHits / totalRequests) * 100 : 0;
    const avgResponseTime = results.responseTimes.length > 0 
      ? results.responseTimes.reduce((sum, t) => sum + t, 0) / results.responseTimes.length 
      : 0;
    
    console.log(`\n📊 Advanced Caching Results:`);
    console.log(`  Cache Hit Rate: ${hitRate.toFixed(2)}% (Target: >${TEST_CONFIG.TARGETS.CACHE_HIT_RATE}%)`);
    console.log(`  Avg Response Time: ${Math.round(avgResponseTime)}ms`);
    console.log(`  Cache Hits: ${results.cacheHits}`);
    console.log(`  Cache Misses: ${results.cacheMisses}`);
    console.log(`  Performance: ${hitRate >= TEST_CONFIG.TARGETS.CACHE_HIT_RATE ? '✅ TARGET MET' : '❌ NEEDS WORK'}`);
    
    return {
      success: hitRate >= TEST_CONFIG.TARGETS.CACHE_HIT_RATE,
      hitRate: Math.round(hitRate),
      avgResponseTime: Math.round(avgResponseTime),
      results
    };
    
  } catch (error) {
    console.error('❌ Advanced caching test failed:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * PHASE 2 TEST 3: Real-Time Performance Monitoring
 */
async function testPerformanceMonitoring() {
  console.log('\n📊 Test 3: Real-Time Performance Monitoring');
  console.log('-'.repeat(50));
  
  try {
    console.log('Testing performance dashboard...');
    const startTime = performance.now();
    
    const response = await fetch(`${BASE_URL}/api/admin/performance-dashboard`, {
      signal: AbortSignal.timeout(TEST_CONFIG.TIMEOUT)
    });
    
    const duration = Math.round(performance.now() - startTime);
    const data = await response.json();
    
    console.log(`  Dashboard Response: ${duration}ms (${response.status})`);
    
    if (response.ok && data) {
      console.log(`\n📈 Performance Dashboard Data:`);
      console.log(`  Overall Health: ${data.health?.status || 'unknown'}`);
      console.log(`  Cache Hit Rate: ${data.cache?.overallHitRate || 'N/A'}`);
      console.log(`  Performance Score: ${data.cache?.performanceScore || 'N/A'}`);
      console.log(`  API Avg Response: ${data.apis?.overall?.avgResponseTime || 'N/A'}`);
      console.log(`  Success Rate: ${data.apis?.overall?.successRate || 'N/A'}`);
      console.log(`  Active Alerts: ${data.health?.alerts?.length || 0}`);
      
      if (data.health?.alerts?.length > 0) {
        console.log(`  Alerts:`);
        data.health.alerts.forEach(alert => console.log(`    - ${alert}`));
      }
      
      const healthScore = data.cache?.performanceScore || 0;
      const success = healthScore >= TEST_CONFIG.TARGETS.SYSTEM_HEALTH_SCORE;
      
      console.log(`  Health Check: ${success ? '✅ TARGET MET' : '❌ NEEDS WORK'}`);
      
      return {
        success,
        duration,
        healthScore,
        data: {
          health: data.health?.status,
          cacheHitRate: data.cache?.overallHitRate,
          performanceScore: data.cache?.performanceScore,
          avgResponseTime: data.apis?.overall?.avgResponseTime,
          successRate: data.apis?.overall?.successRate,
          alertCount: data.health?.alerts?.length || 0
        }
      };
    } else {
      throw new Error(`Dashboard returned ${response.status}: ${data.error || 'Unknown error'}`);
    }
    
  } catch (error) {
    console.error('❌ Performance monitoring test failed:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * PHASE 2 TEST 4: Concurrent Load Testing
 */
async function testConcurrentLoad() {
  console.log('\n⚡ Test 4: Concurrent Load Testing');
  console.log('-'.repeat(50));
  
  const endpoints = [
    { name: 'User Tickets', url: `${BASE_URL}/api/users/${TEST_USER_ID}/tickets`, target: TEST_CONFIG.TARGETS.USER_TICKETS_API },
    { name: 'Queue Position', url: `${BASE_URL}/api/queue/position?userId=${TEST_USER_ID}&eventId=${TEST_EVENT_ID}`, target: TEST_CONFIG.TARGETS.QUEUE_POSITION_API },
    { name: 'Event Availability', url: `${BASE_URL}/api/events/${TEST_EVENT_ID}/availability`, target: TEST_CONFIG.TARGETS.EVENT_AVAILABILITY_API },
    { name: 'Event Details', url: `${BASE_URL}/api/events/${TEST_EVENT_ID}`, target: TEST_CONFIG.TARGETS.EVENT_DETAILS_API }
  ];
  
  const results = {};
  
  try {
    for (const endpoint of endpoints) {
      console.log(`\nTesting ${endpoint.name} under concurrent load...`);
      
      const promises = [];
      const startTime = performance.now();
      
      // Create concurrent requests
      for (let i = 0; i < TEST_CONFIG.CONCURRENT_REQUESTS; i++) {
        promises.push(
          fetch(endpoint.url, {
            signal: AbortSignal.timeout(TEST_CONFIG.TIMEOUT)
          }).then(async response => {
            const duration = Math.round(performance.now() - startTime);
            const data = await response.json().catch(() => ({}));
            
            return {
              status: response.status,
              duration,
              success: response.ok,
              cacheSource: response.headers.get('X-Data-Source'),
              size: JSON.stringify(data).length
            };
          }).catch(error => ({
            status: 0,
            duration: Math.round(performance.now() - startTime),
            success: false,
            error: error.message
          }))
        );
      }
      
      const responses = await Promise.all(promises);
      const successfulResponses = responses.filter(r => r.success);
      const avgDuration = successfulResponses.length > 0 
        ? successfulResponses.reduce((sum, r) => sum + r.duration, 0) / successfulResponses.length 
        : 0;
      
      const maxDuration = Math.max(...responses.map(r => r.duration));
      const minDuration = Math.min(...responses.filter(r => r.success).map(r => r.duration));
      const successRate = (successfulResponses.length / responses.length) * 100;
      
      results[endpoint.name] = {
        avgDuration: Math.round(avgDuration),
        maxDuration,
        minDuration,
        successRate,
        target: endpoint.target,
        success: avgDuration < endpoint.target && successRate >= 95
      };
      
      console.log(`  Avg: ${Math.round(avgDuration)}ms (Target: <${endpoint.target}ms)`);
      console.log(`  Range: ${minDuration}ms - ${maxDuration}ms`);
      console.log(`  Success Rate: ${successRate.toFixed(1)}%`);
      console.log(`  Result: ${results[endpoint.name].success ? '✅ TARGET MET' : '❌ NEEDS WORK'}`);
    }
    
    const overallSuccess = Object.values(results).every(r => r.success);
    
    console.log(`\n📊 Concurrent Load Test Results:`);
    console.log(`  Overall: ${overallSuccess ? '✅ ALL TARGETS MET' : '❌ SOME TARGETS MISSED'}`);
    
    return { success: overallSuccess, results };
    
  } catch (error) {
    console.error('❌ Concurrent load test failed:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * PHASE 2: Cache Warmup Function
 */
async function warmupCaches() {
  console.log('\n🔥 Cache Warmup Phase');
  console.log('-'.repeat(30));
  
  const warmupRequests = [
    { url: `${BASE_URL}/api/users/${TEST_USER_ID}/tickets`, name: 'User Tickets' },
    { url: `${BASE_URL}/api/queue/position?eventId=${TEST_EVENT_ID}&userId=${TEST_USER_ID}`, name: 'Queue Position' },
    { url: `${BASE_URL}/api/events/${TEST_EVENT_ID}/availability`, name: 'Event Availability' },
    { url: `${BASE_URL}/api/events/${TEST_EVENT_ID}`, name: 'Event Details' },
    { url: `${BASE_URL}/api/admin/performance-dashboard`, name: 'Dashboard' }
  ];
  
  console.log('Warming up caches...');
  const warmupPromises = warmupRequests.map(async ({ url, name }, index) => {
    try {
      const startTime = performance.now();
      const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
      const duration = Math.round(performance.now() - startTime);
      console.log(`  Warmup ${index + 1}: ${response.status} ${duration}ms (${name})`);
      return response.ok;
    } catch (error) {
      console.log(`  Warmup ${index + 1}: Error (${name})`);
      return false;
    }
  });
  
  const results = await Promise.all(warmupPromises);
  const successCount = results.filter(Boolean).length;
  console.log(`✅ Cache warmup complete: ${successCount}/${results.length} successful`);
  
  // Small delay to let caches settle
  await new Promise(resolve => setTimeout(resolve, 500));
}

/**
 * PHASE 2: Main Test Runner
 */
async function runPhase2Tests() {
  const startTime = performance.now();
  
  console.log(`\n🚀 Starting Phase 2 Advanced Optimization Tests...`);
  console.log(`Time: ${new Date().toISOString()}`);
  
  // PHASE 2: Warm up caches before testing
  await warmupCaches();
  
  const results = {
    queryOptimization: await testAdvancedQueryOptimization(),
    advancedCaching: await testAdvancedCaching(),
    performanceMonitoring: await testPerformanceMonitoring(),
    concurrentLoad: await testConcurrentLoad()
  };
  
  const totalDuration = Math.round(performance.now() - startTime);
  
  // Calculate overall success
  const testResults = Object.values(results);
  const successfulTests = testResults.filter(r => r.success).length;
  const totalTests = testResults.length;
  const overallSuccess = successfulTests === totalTests;
  
  console.log('\n' + '='.repeat(60));
  console.log('🎯 PHASE 2: ADVANCED OPTIMIZATION TEST SUMMARY');
  console.log('='.repeat(60));
  
  console.log(`\n📊 Test Results:`);
  console.log(`  Query Optimization: ${results.queryOptimization.success ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`  Advanced Caching: ${results.advancedCaching.success ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`  Performance Monitoring: ${results.performanceMonitoring.success ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`  Concurrent Load Testing: ${results.concurrentLoad.success ? '✅ PASSED' : '❌ FAILED'}`);
  
  console.log(`\n🎯 Performance Achievements:`);
  if (results.queryOptimization.success) {
    console.log(`  ✅ User Tickets API: ${results.queryOptimization.avgUserTicketsAPI}ms (Target: <${TEST_CONFIG.TARGETS.USER_TICKETS_API}ms)`);
  }
  if (results.advancedCaching.success) {
    console.log(`  ✅ Cache Hit Rate: ${results.advancedCaching.hitRate}% (Target: >${TEST_CONFIG.TARGETS.CACHE_HIT_RATE}%)`);
  }
  if (results.performanceMonitoring.success) {
    console.log(`  ✅ System Health Score: ${results.performanceMonitoring.healthScore} (Target: >${TEST_CONFIG.TARGETS.SYSTEM_HEALTH_SCORE})`);
  }
  
  console.log(`\n📈 Overall Results:`);
  console.log(`  Tests Passed: ${successfulTests}/${totalTests}`);
  console.log(`  Success Rate: ${((successfulTests / totalTests) * 100).toFixed(1)}%`);
  console.log(`  Total Duration: ${totalDuration}ms`);
  console.log(`  Status: ${overallSuccess ? '🎉 PHASE 2 SUCCESS!' : '⚠️ SOME OPTIMIZATIONS NEEDED'}`);
  
  if (!overallSuccess) {
    console.log(`\n🔧 Recommendations:`);
    if (!results.queryOptimization.success) {
      console.log(`  - Further optimize Convex queries and database indexing`);
    }
    if (!results.advancedCaching.success) {
      console.log(`  - Adjust cache TTL values and implement more aggressive caching`);
    }
    if (!results.performanceMonitoring.success) {
      console.log(`  - Check system resources and optimize monitoring overhead`);
    }
    if (!results.concurrentLoad.success) {
      console.log(`  - Scale infrastructure and optimize for higher concurrency`);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  
  return {
    success: overallSuccess,
    results,
    summary: {
      testsTotal: totalTests,
      testsPassed: successfulTests,
      successRate: (successfulTests / totalTests) * 100,
      duration: totalDuration
    }
  };
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runPhase2Tests()
    .then(results => {
      process.exit(results.success ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Phase 2 test suite failed:', error);
      process.exit(1);
    });
}

export { runPhase2Tests }; 