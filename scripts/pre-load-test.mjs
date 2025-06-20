#!/usr/bin/env node

import { performance } from 'perf_hooks';

const BASE_URL = 'http://localhost:3000';
const EVENT_ID = 'jh716mjrw1nd9cven9w80k760s7j4a9j';
const USER_ID = 'user_2vIL4uwniO0WzDdyaAQ6CdjVW4V';

console.log('🚀 EVENT-PULSE PRE-LOAD TEST');
console.log('============================\n');

// Test system readiness
async function testSystemReadiness() {
  const tests = [
    {
      name: 'Redis Health Check',
      url: `${BASE_URL}/api/health/redis`,
      timeout: 5000,
      expectedStatus: 200,
    },
    {
      name: 'Event Availability',
      url: `${BASE_URL}/api/events/${EVENT_ID}/availability`,
      timeout: 5000,
      expectedStatus: 200,
    },
    {
      name: 'Queue Position',
      url: `${BASE_URL}/api/queue/position?eventId=${EVENT_ID}&userId=${USER_ID}`,
      timeout: 8000,
      expectedStatus: 200,
    },
    {
      name: 'Event Details',
      url: `${BASE_URL}/api/events/${EVENT_ID}`,
      timeout: 5000,
      expectedStatus: 200,
    },
  ];

  let passed = 0;
  let totalResponseTime = 0;

  for (const test of tests) {
    const startTime = performance.now();
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), test.timeout);
      
      const response = await fetch(test.url, {
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      const endTime = performance.now();
      const responseTime = Math.round(endTime - startTime);
      totalResponseTime += responseTime;
      
      const success = response.status === test.expectedStatus;
      
      if (success) {
        console.log(`✅ ${test.name}: ${responseTime}ms`);
        passed++;
      } else {
        console.log(`❌ ${test.name}: ${response.status} (${responseTime}ms)`);
      }
      
    } catch (error) {
      const endTime = performance.now();
      const responseTime = Math.round(endTime - startTime);
      
      if (error.name === 'AbortError') {
        console.log(`⏰ ${test.name}: Timeout after ${test.timeout}ms`);
      } else {
        console.log(`❌ ${test.name}: ${error.message} (${responseTime}ms)`);
      }
    }
  }

  const avgResponseTime = Math.round(totalResponseTime / tests.length);
  const successRate = Math.round((passed / tests.length) * 100);

  console.log('\n📊 Pre-Load Test Results:');
  console.log(`• Tests Passed: ${passed}/${tests.length} (${successRate}%)`);
  console.log(`• Average Response Time: ${avgResponseTime}ms`);

  if (passed === tests.length && avgResponseTime < 3000) {
    console.log('\n🎯 System is READY for load testing!');
    console.log('\n🚀 Run the load test with:');
    console.log('   npm run load-test-quick    # 2 minute test with 10 users');
    console.log('   npm run load-test          # Full 7 minute test with up to 50 users');
    return true;
  } else {
    console.log('\n⚠️  System may not be ready for load testing:');
    if (passed < tests.length) {
      console.log(`   • ${tests.length - passed} tests failing`);
    }
    if (avgResponseTime >= 3000) {
      console.log(`   • High response times (${avgResponseTime}ms average)`);
    }
    console.log('\n🔧 Consider running: npm run health');
    return false;
  }
}

// Test BullMQ status
async function testBullMQStatus() {
  console.log('\n🔄 BullMQ Status Check:');
  
  try {
    // Test if we can create a simple queue job
    const response = await fetch(`${BASE_URL}/api/queue/position?eventId=${EVENT_ID}&userId=${USER_ID}`, {
      method: 'GET',
    });
    
    if (response.status === 200) {
      console.log('✅ BullMQ queue system is responding');
      
      // Check if there are any active jobs from our earlier test
      const body = await response.text();
      if (body && body !== 'null') {
        console.log('ℹ️  Found queue data from previous tests');
      }
    } else {
      console.log('⚠️  BullMQ queue system may have issues');
    }
  } catch (error) {
    console.log('❌ BullMQ queue system error:', error.message);
  }
}

// Check Redis connection stability
async function testRedisStability() {
  console.log('\n🔌 Redis Connection Stability Test:');
  
  const promises = [];
  for (let i = 0; i < 5; i++) {
    promises.push(
      fetch(`${BASE_URL}/api/health/redis`)
        .then(r => r.status === 200)
        .catch(() => false)
    );
  }
  
  const results = await Promise.all(promises);
  const successCount = results.filter(Boolean).length;
  
  if (successCount === 5) {
    console.log('✅ Redis connections are stable (5/5 succeeded)');
  } else {
    console.log(`⚠️  Redis connection instability detected (${successCount}/5 succeeded)`);
  }
}

// Main execution
async function main() {
  const systemReady = await testSystemReadiness();
  await testBullMQStatus();
  await testRedisStability();
  
  if (systemReady) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Pre-load test failed:', error);
  process.exit(1);
}); 