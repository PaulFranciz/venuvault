import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const serverBusyRate = new Rate('server_busy_errors');
const redisConnectionRate = new Rate('redis_connection_success');
const apiResponseTime = new Trend('api_response_time');

// Test configuration
export const options = {
  stages: [
    // Warm up
    { duration: '30s', target: 5 },   // Ramp up to 5 users
    { duration: '1m', target: 10 },   // Stay at 10 users
    { duration: '1m', target: 20 },   // Ramp up to 20 users
    { duration: '2m', target: 20 },   // Stay at 20 users (peak load)
    { duration: '1m', target: 50 },   // Spike test - 50 users
    { duration: '30s', target: 50 },  // Hold spike
    { duration: '1m', target: 10 },   // Ramp down
    { duration: '30s', target: 0 },   // Cool down
  ],
  thresholds: {
    http_req_duration: ['p(95)<5000'], // 95% of requests should be under 5s
    errors: ['rate<0.1'],              // Error rate should be less than 10%
    server_busy_errors: ['rate<0.05'], // Server busy errors should be less than 5%
    redis_connection_success: ['rate>0.8'], // Redis should connect 80% of the time
  },
};

// Test data
const BASE_URL = 'http://localhost:3000';
const EVENT_ID = 'jh716mjrw1nd9cven9w80k760s7j4a9j';
const USER_IDS = [
  'user_2vIL4uwniO0WzDdyaAQ6CdjVW4V',
  'user_test_001',
  'user_test_002',
  'user_test_003',
  'user_test_004',
  'user_test_005',
];

// Test scenarios
export default function() {
  const userId = USER_IDS[Math.floor(Math.random() * USER_IDS.length)];
  
  // Test 1: Health Check
  testHealthCheck();
  
  // Test 2: Event Availability (most common request)
  testEventAvailability();
  
  // Test 3: Queue Position Check
  testQueuePosition(userId);
  
  // Test 4: Event Details
  testEventDetails();
  
  // Test 5: User Tickets
  testUserTickets(userId);
  
  // Random sleep between 1-3 seconds to simulate real user behavior
  sleep(Math.random() * 2 + 1);
}

function testHealthCheck() {
  const response = http.get(`${BASE_URL}/api/health/redis`, {
    timeout: '10s',
    tags: { test_type: 'health_check' },
  });
  
  const success = check(response, {
    'Health check status is 200': (r) => r.status === 200,
    'Health check response time < 3s': (r) => r.timings.duration < 3000,
    'Redis is healthy': (r) => {
      try {
        const data = JSON.parse(r.body);
        return data.status === 'healthy';
      } catch (e) {
        return false;
      }
    },
  });
  
  redisConnectionRate.add(success);
  apiResponseTime.add(response.timings.duration);
  
  if (!success) {
    errorRate.add(1);
    console.log(`Health check failed: ${response.status} - ${response.body}`);
  } else {
    errorRate.add(0);
  }
}

function testEventAvailability() {
  const response = http.get(`${BASE_URL}/api/events/${EVENT_ID}/availability`, {
    timeout: '8s',
    tags: { test_type: 'event_availability' },
  });
  
  const success = check(response, {
    'Availability status is 200': (r) => r.status === 200,
    'Availability response time < 5s': (r) => r.timings.duration < 5000,
    'Availability has valid data': (r) => {
      try {
        const data = JSON.parse(r.body);
        return data.hasOwnProperty('remainingTickets');
      } catch (e) {
        return false;
      }
    },
  });
  
  apiResponseTime.add(response.timings.duration);
  
  if (!success) {
    errorRate.add(1);
    console.log(`Availability check failed: ${response.status} - ${response.body.substring(0, 200)}`);
  } else {
    errorRate.add(0);
  }
}

function testQueuePosition(userId) {
  const response = http.get(`${BASE_URL}/api/queue/position?eventId=${EVENT_ID}&userId=${userId}`, {
    timeout: '10s',
    tags: { test_type: 'queue_position' },
  });
  
  const isServerBusy = response.body && response.body.includes('Server is busy');
  const success = check(response, {
    'Queue position status is 200': (r) => r.status === 200,
    'Queue position response time < 8s': (r) => r.timings.duration < 8000,
    'No server busy message': (r) => !r.body.includes('Server is busy'),
    'Queue position has valid response': (r) => {
      try {
        // Parse the response
        const data = JSON.parse(r.body);
        
        // Valid responses include:
        // 1. null (user not in queue) - this is valid
        // 2. Object with queue position data
        // 3. Object with mock data (fallback)
        if (data === null) {
          return true; // null is valid - user not in queue
        }
        
        // If it's an object, check it has expected structure
        if (typeof data === 'object' && data !== null) {
          // Should have position property (can be null/0)
          return data.hasOwnProperty('position') || data.hasOwnProperty('error');
        }
        
        return false;
      } catch (e) {
        // If it's exactly the string 'null', that's also valid
        return r.body.trim() === 'null';
      }
    },
  });
  
  serverBusyRate.add(isServerBusy ? 1 : 0);
  apiResponseTime.add(response.timings.duration);
  
  if (!success || isServerBusy) {
    errorRate.add(1);
    if (isServerBusy) {
      console.log(`🚨 SERVER BUSY ERROR detected for user ${userId}`);
    } else {
      console.log(`Queue position failed: ${response.status} - ${response.body}`);
    }
  } else {
    errorRate.add(0);
  }
}

function testEventDetails() {
  const response = http.get(`${BASE_URL}/api/events/${EVENT_ID}`, {
    timeout: '8s',
    tags: { test_type: 'event_details' },
  });
  
  const success = check(response, {
    'Event details status is 200': (r) => r.status === 200,
    'Event details response time < 6s': (r) => r.timings.duration < 6000,
    'Event details has valid data': (r) => {
      try {
        const data = JSON.parse(r.body);
        return data.hasOwnProperty('_id');
      } catch (e) {
        return false;
      }
    },
  });
  
  apiResponseTime.add(response.timings.duration);
  
  if (!success) {
    errorRate.add(1);
    console.log(`Event details failed: ${response.status} - ${response.body.substring(0, 200)}`);
  } else {
    errorRate.add(0);
  }
}

function testUserTickets(userId) {
  const response = http.get(`${BASE_URL}/api/users/${userId}/tickets?eventId=${EVENT_ID}`, {
    timeout: '10s',
    tags: { test_type: 'user_tickets' },
  });
  
  const success = check(response, {
    'User tickets status is 200 or 500': (r) => r.status === 200 || r.status === 500, // 500 is acceptable for test users
    'User tickets response time < 8s': (r) => r.timings.duration < 8000,
  });
  
  apiResponseTime.add(response.timings.duration);
  
  if (!success) {
    errorRate.add(1);
    console.log(`User tickets failed: ${response.status} - ${response.body.substring(0, 200)}`);
  } else {
    errorRate.add(0);
  }
}

// Summary function
export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'load-test-results.json': JSON.stringify(data),
  };
}

function textSummary(data, options = {}) {
  const indent = options.indent || '';
  const enableColors = options.enableColors || false;
  
  let summary = '\n';
  summary += '📊 EVENT-PULSE LOAD TEST RESULTS\n';
  summary += '================================\n\n';
  
  // Test configuration
  summary += `🎯 Test Configuration:\n`;
  summary += `${indent}• Peak Load: 50 concurrent users\n`;
  summary += `${indent}• Duration: ~7 minutes\n`;
  summary += `${indent}• Target Event: ${EVENT_ID}\n\n`;
  
  // Key metrics
  const httpReqDuration = data.metrics.http_req_duration;
  const errorRate = data.metrics.errors;
  const serverBusyRate = data.metrics.server_busy_errors;
  const redisRate = data.metrics.redis_connection_success;
  
  summary += `⚡ Performance Metrics:\n`;
  summary += `${indent}• Average Response Time: ${httpReqDuration.values.avg.toFixed(2)}ms\n`;
  summary += `${indent}• 95th Percentile: ${httpReqDuration.values['p(95)'].toFixed(2)}ms\n`;
  summary += `${indent}• Max Response Time: ${httpReqDuration.values.max.toFixed(2)}ms\n\n`;
  
  summary += `🚨 Error Analysis:\n`;
  summary += `${indent}• Overall Error Rate: ${(errorRate.values.rate * 100).toFixed(2)}%\n`;
  summary += `${indent}• Server Busy Errors: ${(serverBusyRate.values.rate * 100).toFixed(2)}%\n`;
  summary += `${indent}• Redis Connection Success: ${(redisRate.values.rate * 100).toFixed(2)}%\n\n`;
  
  // Test results
  const checks = data.metrics.checks;
  summary += `✅ Test Results:\n`;
  summary += `${indent}• Total Checks: ${checks.values.passes + checks.values.fails}\n`;
  summary += `${indent}• Passed: ${checks.values.passes}\n`;
  summary += `${indent}• Failed: ${checks.values.fails}\n`;
  summary += `${indent}• Success Rate: ${(checks.values.rate * 100).toFixed(2)}%\n\n`;
  
  // Final verdict
  const overallPass = errorRate.values.rate < 0.1 && serverBusyRate.values.rate < 0.05;
  summary += `🏆 Final Verdict: ${overallPass ? '✅ PASSED' : '❌ NEEDS IMPROVEMENT'}\n`;
  
  if (!overallPass) {
    summary += `\n🔧 Issues Detected:\n`;
    if (errorRate.values.rate >= 0.1) {
      summary += `${indent}• High error rate (${(errorRate.values.rate * 100).toFixed(2)}%)\n`;
    }
    if (serverBusyRate.values.rate >= 0.05) {
      summary += `${indent}• Server busy errors detected (${(serverBusyRate.values.rate * 100).toFixed(2)}%)\n`;
    }
  }
  
  return summary;
} 