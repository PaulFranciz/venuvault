#!/usr/bin/env node

/**
 * EventPulse Concurrent User Capacity Validation
 * Practical load testing to validate capacity estimates
 */

import { performance } from 'perf_hooks';

const BASE_URL = process.env.NEXT_PUBLIC_CONVEX_URL ? 
  'http://localhost:3000' : 
  'https://event-pulse.vercel.app';

const TEST_CONFIG = {
  eventId: 'jh716mjrw1nd9cven9w80k760s7j4a9j',
  userId: 'k57ak0qgdx9jx1zqg2hn5zb56h7gzxgf',
  concurrentLevels: [50, 100, 200, 500, 800, 1000], // Users to test
  testDuration: 30, // seconds
  requestInterval: 2000, // ms between requests per user
};

const API_ENDPOINTS = {
  userTickets: `/api/users/${TEST_CONFIG.userId}/tickets`,
  queuePosition: `/api/queue/position?eventId=${TEST_CONFIG.eventId}`,
  eventAvailability: `/api/events/${TEST_CONFIG.eventId}/availability`,
  eventDetails: `/api/events/${TEST_CONFIG.eventId}`,
};

class ConcurrentUserSimulator {
  constructor() {
    this.results = [];
    this.activeUsers = 0;
    this.totalRequests = 0;
    this.successfulRequests = 0;
    this.failedRequests = 0;
    this.responseTimes = [];
  }

  async simulateUser(userId, duration) {
    const startTime = Date.now();
    const endTime = startTime + (duration * 1000);
    
    while (Date.now() < endTime) {
      try {
        // Simulate realistic user behavior - mix of different API calls
        const endpoint = this.getRandomEndpoint();
        const requestStart = performance.now();
        
        const response = await fetch(`${BASE_URL}${endpoint}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const requestEnd = performance.now();
        const responseTime = requestEnd - requestStart;
        
        this.totalRequests++;
        this.responseTimes.push(responseTime);
        
        if (response.ok) {
          this.successfulRequests++;
        } else {
          this.failedRequests++;
          console.log(`❌ User ${userId}: ${response.status} - ${endpoint}`);
        }

        // Wait before next request (simulate user think time)
        await this.sleep(TEST_CONFIG.requestInterval + Math.random() * 1000);
        
      } catch (error) {
        this.failedRequests++;
        console.log(`💥 User ${userId}: ${error.message}`);
        await this.sleep(1000); // Short wait on error
      }
    }
    
    this.activeUsers--;
  }

  getRandomEndpoint() {
    const endpoints = Object.values(API_ENDPOINTS);
    return endpoints[Math.floor(Math.random() * endpoints.length)];
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async testConcurrentLevel(concurrentUsers) {
    console.log(`\n🧪 Testing ${concurrentUsers} concurrent users...`);
    console.log("-".repeat(50));
    
    // Reset metrics
    this.activeUsers = concurrentUsers;
    this.totalRequests = 0;
    this.successfulRequests = 0;
    this.failedRequests = 0;
    this.responseTimes = [];

    const startTime = performance.now();
    
    // Launch all concurrent users
    const userPromises = [];
    for (let i = 0; i < concurrentUsers; i++) {
      userPromises.push(this.simulateUser(i + 1, TEST_CONFIG.testDuration));
      
      // Stagger user starts slightly to avoid thundering herd
      if (i % 10 === 0 && i > 0) {
        await this.sleep(100);
      }
    }

    // Wait for all users to complete
    await Promise.all(userPromises);
    
    const endTime = performance.now();
    const totalDuration = (endTime - startTime) / 1000;

    // Calculate metrics
    const avgResponseTime = this.responseTimes.length > 0 ? 
      this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length : 0;
    
    const p95ResponseTime = this.responseTimes.length > 0 ?
      this.responseTimes.sort((a, b) => a - b)[Math.floor(this.responseTimes.length * 0.95)] : 0;
    
    const successRate = (this.successfulRequests / this.totalRequests) * 100;
    const requestsPerSecond = this.totalRequests / totalDuration;

    const result = {
      concurrentUsers,
      totalRequests: this.totalRequests,
      successfulRequests: this.successfulRequests,
      failedRequests: this.failedRequests,
      successRate: successRate.toFixed(1),
      avgResponseTime: avgResponseTime.toFixed(0),
      p95ResponseTime: p95ResponseTime.toFixed(0),
      requestsPerSecond: requestsPerSecond.toFixed(1),
      duration: totalDuration.toFixed(1),
      status: this.getStatus(successRate, avgResponseTime)
    };

    this.results.push(result);
    
    // Display results
    console.log(`📊 Results:`);
    console.log(`   Total Requests: ${result.totalRequests}`);
    console.log(`   Success Rate: ${result.successRate}%`);
    console.log(`   Avg Response Time: ${result.avgResponseTime}ms`);
    console.log(`   95th Percentile: ${result.p95ResponseTime}ms`);
    console.log(`   Requests/Second: ${result.requestsPerSecond}`);
    console.log(`   Status: ${result.status}`);

    return result;
  }

  getStatus(successRate, avgResponseTime) {
    if (successRate >= 99 && avgResponseTime <= 300) return "🟢 EXCELLENT";
    if (successRate >= 95 && avgResponseTime <= 500) return "🟡 GOOD";
    if (successRate >= 90 && avgResponseTime <= 1000) return "🟠 ACCEPTABLE";
    return "🔴 POOR";
  }

  async runCapacityTest() {
    console.log("🚀 EventPulse Concurrent User Capacity Validation");
    console.log("=".repeat(60));
    console.log(`Base URL: ${BASE_URL}`);
    console.log(`Test Duration: ${TEST_CONFIG.testDuration}s per level`);
    console.log(`Request Interval: ${TEST_CONFIG.requestInterval}ms`);

    // Test each concurrent user level
    for (const level of TEST_CONFIG.concurrentLevels) {
      try {
        await this.testConcurrentLevel(level);
        
        // Brief pause between tests to let system recover
        console.log("⏳ Cooling down...");
        await this.sleep(5000);
        
      } catch (error) {
        console.error(`❌ Failed to test ${level} users: ${error.message}`);
        this.results.push({
          concurrentUsers: level,
          status: "🔴 FAILED",
          error: error.message
        });
      }
    }

    this.displaySummary();
  }

  displaySummary() {
    console.log("\n📋 CONCURRENT USER CAPACITY VALIDATION SUMMARY");
    console.log("=".repeat(60));
    
    console.log("\n| Users | Requests | Success% | Avg RT | P95 RT | Req/s | Status     |");
    console.log("|-------|----------|----------|--------|--------|-------|------------|");
    
    this.results.forEach(result => {
      if (result.error) {
        console.log(`| ${result.concurrentUsers.toString().padEnd(5)} | FAILED   | -        | -      | -      | -     | ${result.status} |`);
      } else {
        console.log(`| ${result.concurrentUsers.toString().padEnd(5)} | ${result.totalRequests.toString().padEnd(8)} | ${result.successRate.padEnd(8)} | ${result.avgResponseTime.padEnd(6)} | ${result.p95ResponseTime.padEnd(6)} | ${result.requestsPerSecond.padEnd(5)} | ${result.status} |`);
      }
    });

    // Find capacity thresholds
    const excellentThreshold = this.results.find(r => r.status && r.status.includes("EXCELLENT"));
    const lastGoodResult = this.results.filter(r => r.status && (r.status.includes("EXCELLENT") || r.status.includes("GOOD"))).pop();
    const firstPoorResult = this.results.find(r => r.status && r.status.includes("POOR"));

    console.log("\n🎯 CAPACITY ANALYSIS:");
    console.log("-".repeat(40));
    
    if (excellentThreshold) {
      console.log(`✅ Excellent Performance: Up to ${excellentThreshold.concurrentUsers} users`);
    }
    
    if (lastGoodResult) {
      console.log(`🟡 Acceptable Performance: Up to ${lastGoodResult.concurrentUsers} users`);
    }
    
    if (firstPoorResult) {
      console.log(`🔴 Performance Degradation: At ${firstPoorResult.concurrentUsers} users`);
    }

    // Recommendations
    console.log("\n📋 PRODUCTION RECOMMENDATIONS:");
    console.log("-".repeat(40));
    
    if (lastGoodResult) {
      const safeLimit = Math.floor(lastGoodResult.concurrentUsers * 0.8);
      console.log(`• Safe Production Limit: ${safeLimit} concurrent users`);
      console.log(`• Monitor Threshold: ${Math.floor(lastGoodResult.concurrentUsers * 0.9)} concurrent users`);
      console.log(`• Scale-up Trigger: ${lastGoodResult.concurrentUsers} concurrent users`);
    }
  }
}

// Run the capacity validation test
if (import.meta.url === `file://${process.argv[1]}`) {
  const simulator = new ConcurrentUserSimulator();
  simulator.runCapacityTest().catch(console.error);
}

export { ConcurrentUserSimulator }; 