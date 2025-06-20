import { NextResponse } from 'next/server';
import { getRedisClient } from '@/lib/redis';

export async function GET() {
  try {
    const redis = getRedisClient();
    
    // Test Redis connection with a simple ping
    const pingResult = await redis.ping();
    
    if (pingResult === 'PONG' || pingResult === 'OK') {
      return NextResponse.json({
        status: 'healthy',
        redis: 'connected',
        timestamp: new Date().toISOString()
      });
    } else {
      return NextResponse.json({
        status: 'unhealthy',
        redis: 'ping_failed',
        result: pingResult,
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Redis health check failed:', error);
    return NextResponse.json({
      status: 'unhealthy',
      redis: 'connection_failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 