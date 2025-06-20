import { NextResponse } from 'next/server';
import { getRedisMetrics } from '@/lib/redis';

export async function GET(request: Request) {
  try {
    // Get Redis performance metrics
    const redisMetrics = getRedisMetrics();
    
    // Calculate system performance stats
    const systemMetrics = {
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      nodeVersion: process.version,
      platform: process.platform,
      timestamp: Date.now()
    };
    
    // API Performance baselines (targets after optimization)
    const performanceTargets = {
      userTicketsApi: { target: 300, current: 'measuring...' },
      queuePositionApi: { target: 500, current: 'measuring...' },
      eventAvailabilityApi: { target: 400, current: 'measuring...' },
      eventDetailsApi: { target: 600, current: 'measuring...' }
    };
    
    const metrics = {
      redis: redisMetrics,
      system: systemMetrics,
      performance: {
        targets: performanceTargets,
        optimizationPhase: 'Phase 1: Critical Fixes',
        lastUpdate: new Date().toISOString()
      },
      health: {
        overall: 'healthy',
        issues: [],
        recommendations: getHealthRecommendations(redisMetrics)
      }
    };
    
    return NextResponse.json(metrics, {
      status: 200,
      headers: {
        'Cache-Control': 'no-cache', // Always fresh metrics
        'X-Metrics-Version': '1.0'
      }
    });
    
  } catch (error) {
    console.error('Failed to fetch performance metrics:', error);
    
    return NextResponse.json({
      error: 'Failed to fetch metrics',
      timestamp: Date.now()
    }, {
      status: 500
    });
  }
}

function getHealthRecommendations(redisMetrics: any): string[] {
  const recommendations = [];
  
  if (redisMetrics.circuitBreakerOpen) {
    recommendations.push('Redis circuit breaker is open - check Redis connectivity');
  }
  
  if (parseFloat(redisMetrics.successRate) < 95) {
    recommendations.push('Redis success rate is below 95% - investigate connection issues');
  }
  
  if (redisMetrics.averageResponseTime > 100) {
    recommendations.push('Redis average response time is high - consider connection pool optimization');
  }
  
  if (redisMetrics.poolSize === 0) {
    recommendations.push('No Redis connections in pool - service may be degraded');
  }
  
  if (recommendations.length === 0) {
    recommendations.push('All systems operating normally');
  }
  
  return recommendations;
} 