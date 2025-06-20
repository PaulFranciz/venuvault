import { NextResponse } from 'next/server';
import { withCache } from '@/lib/cache';
import { redisKeys, REDIS_TTL } from '@/lib/redis';

// Connection limiter to prevent Redis overload - increased for load testing
let activeConnections = 0;
const MAX_CONNECTIONS = 10; // Increased from 3 to handle more concurrent requests

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
      isMockData: true
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
          // Direct Convex API call instead of ConvexHttpClient
          try {
            const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
            if (!convexUrl) {
              throw new Error('NEXT_PUBLIC_CONVEX_URL not configured');
            }

            const response = await fetch(`${convexUrl}/api/query`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                path: 'waitingList:getQueuePosition',
                args: { eventId, userId }
              }),
            });

            if (!response.ok) {
              throw new Error(`Convex API returned ${response.status}`);
            }

            const convexResponse = await response.json();
            
            // Convex wraps responses in {status: "success", value: actualData}
            const result = convexResponse.status === 'success' ? convexResponse.value : convexResponse;
            
            // Ensure we always return a valid object structure
            return result || {
              position: 0,
              estimatedWaitTime: '0 minutes',
              isInQueue: false,
              queueSize: 0,
              timestamp: Date.now()
            };
          } catch (convexError) {
            console.error('Convex queue position query failed:', convexError);
            // Return a consistent mock queue position on Convex failure
            return {
              position: 0,
              estimatedWaitTime: '0 minutes',
              isInQueue: false,
              queueSize: 0,
              timestamp: Date.now(),
              error: 'Queue service temporarily unavailable',
              isMockData: true
            };
          }
        },
        { ttl: REDIS_TTL.QUEUE_POSITION } // 10 minutes TTL
      );
      
      // Ensure response is never null
      const validResponse = queuePosition || {
        position: 0,
        estimatedWaitTime: '0 minutes',
        isInQueue: false,
        queueSize: 0,
        timestamp: Date.now(),
        isMockData: true
      };
      
      const response = NextResponse.json(validResponse, { status: 200 });
      response.headers.set('X-Data-Source', validResponse?.isMockData ? 'mock-fallback' : 'convex-cached');
      return response;
      
    } catch (error) {
      console.error('Failed to fetch queue position with cache:', error);
      
      try {
        // Direct fallback to Convex if Redis fails
        const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
        if (!convexUrl) {
          throw new Error('NEXT_PUBLIC_CONVEX_URL not configured');
        }

        const response = await fetch(`${convexUrl}/api/query`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            path: 'waitingList:getQueuePosition',
            args: { eventId, userId }
          }),
        });

        if (!response.ok) {
          throw new Error(`Convex API returned ${response.status}`);
        }

        const queuePosition = await response.json();
        
        // Ensure valid response structure
        const validResponse = queuePosition || {
          position: 0,
          estimatedWaitTime: '0 minutes',
          isInQueue: false,
          queueSize: 0,
          timestamp: Date.now()
        };
        
        const nextResponse = NextResponse.json(validResponse, { status: 200 });
        nextResponse.headers.set('X-Data-Source', 'convex-direct');
        return nextResponse;
        
      } catch (convexError) {
        console.error('Direct Convex query also failed:', convexError);
        
        // Final fallback - return consistent empty queue state
        const fallbackResponse = {
          position: 0,
          estimatedWaitTime: '0 minutes',
          isInQueue: false,
          queueSize: 0,
          timestamp: Date.now(),
          error: 'Queue service temporarily unavailable',
          isMockData: true
        };
        
        const response = NextResponse.json(fallbackResponse, { status: 200 });
        response.headers.set('X-Data-Source', 'fallback');
        return response;
      }
    }
  } catch (error) {
    console.error('[queue-position] Unexpected error:', error);
    
    // Even for 500 errors, return a consistent JSON structure
    const errorResponse = {
      position: 0,
      estimatedWaitTime: '0 minutes',
      isInQueue: false,
      queueSize: 0,
      timestamp: Date.now(),
      error: 'Internal server error',
      isMockData: true
    };
    
    return NextResponse.json(errorResponse, { status: 500 });
  } finally {
    activeConnections--;
  }
}
