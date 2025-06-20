import { NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';
import { withCache } from '@/lib/cache';
import { redisKeys, REDIS_TTL } from '@/lib/redis';

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL || '');

// Connection limiter to prevent Redis overload
let activeConnections = 0;
const MAX_CONNECTIONS = 3;

export async function GET(request: Request) {
  // Rate limiting for Redis connections
  if (activeConnections >= MAX_CONNECTIONS) {
    console.log('[queue-position] Too many active connections, rejecting request');
    return NextResponse.json({
      position: null,
      inQueue: false,
      queueSize: 0,
      timestamp: Date.now(),
      error: 'Server busy, please try again in a moment',
    });
  }
  
  activeConnections++;
  
  try {
  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get('eventId');
  const userId = searchParams.get('userId');
  
  if (!eventId || !userId) {
    return NextResponse.json(
      { error: 'Event ID and User ID are required' },
      { status: 400 }
    );
  }

  try {
    // Server-side Redis cache with fallback to Convex - reduced TTL
    const cacheKey = redisKeys.queuePosition(eventId, userId);
    const queuePosition = await withCache(
      cacheKey,
      async () => {
        // This only runs on cache miss
        try {
          const result = await convex.query(api.waitingList.getQueuePosition, { 
            eventId: eventId as any,
            userId: userId
          });
          return result;
        } catch (convexError) {
          console.error('Convex queue position query failed:', convexError);
          // Return a mock queue position on Convex failure
          return {
            position: 0,
            estimatedWaitTime: '0 minutes',
            isInQueue: false,
            error: 'Queue service temporarily unavailable',
            isMockData: true
          };
        }
      },
      { ttl: REDIS_TTL.QUEUE_POSITION } // 10 minutes TTL
    );
    
    const response = NextResponse.json(queuePosition, { status: 200 });
    response.headers.set('X-Data-Source', queuePosition?.isMockData ? 'mock-fallback' : 'convex-cached');
    return response;
    
  } catch (error) {
    console.error('Failed to fetch queue position with cache:', error);
    
    try {
      // Direct fallback to Convex if Redis fails
      const queuePosition = await convex.query(api.waitingList.getQueuePosition, { 
        eventId: eventId as any,
        userId: userId
      });
      
      const response = NextResponse.json(queuePosition, { status: 200 });
      response.headers.set('X-Data-Source', 'convex-direct');
      return response;
      
    } catch (convexError) {
      console.error('Direct Convex query also failed:', convexError);
      
      // Final fallback - return empty queue state
      const fallbackResponse = {
        position: 0,
        estimatedWaitTime: '0 minutes',
        isInQueue: false,
        error: 'Queue service temporarily unavailable',
        isMockData: true
      };
      
      const response = NextResponse.json(fallbackResponse, { status: 200 });
      response.headers.set('X-Data-Source', 'fallback');
      return response;
    }
  }
}
