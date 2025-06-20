import { NextResponse } from 'next/server';
import { withAdvancedCache, CACHE_CONFIGS } from '@/lib/advanced-cache';
import { redisKeys, REDIS_TTL } from '@/lib/redis';

// Optimized connection management - increased limits for better performance
let activeConnections = 0;
const MAX_CONNECTIONS = 25; // Increased from 10 to handle more concurrent requests
const CONNECTION_TIMEOUT = 8000; // 8 seconds timeout
const QUEUE_POSITION_CACHE_TTL = REDIS_TTL.QUEUE_POSITION; // 2 minutes

export async function GET(request: Request) {
  const startTime = performance.now();
  
  // Enhanced rate limiting with better error messages
  if (activeConnections >= MAX_CONNECTIONS) {
    console.log(`[queue-position] Connection limit reached (${activeConnections}/${MAX_CONNECTIONS})`);
    
    // Return immediate response instead of making users wait
    return NextResponse.json({
      position: null,
      inQueue: false,
      queueSize: 0,
      timestamp: Date.now(),
      waitingTimeEstimate: null,
      message: 'High traffic detected. Please refresh in a moment.',
      retryAfter: 5, // Suggest retry after 5 seconds
      isBusy: true
    }, {
      status: 200, // Use 200 instead of 503 for better UX
      headers: {
        'X-Data-Source': 'rate-limited',
        'X-Response-Time': `${Math.round(performance.now() - startTime)}ms`,
        'Cache-Control': 'no-cache',
        'Retry-After': '5'
      }
    });
  }
  
  activeConnections++;
  
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId');
    const userId = searchParams.get('userId');
    
    if (!eventId || !userId) {
      return NextResponse.json(
        { 
          error: 'Event ID and User ID are required',
          eventId: eventId || null,
          userId: userId || null 
        },
        { status: 400 }
      );
    }
    
    // Use advanced caching for better performance
    const queueData = await withAdvancedCache(
      `queue:${eventId}:${userId}`,
      async () => {
        try {
          // Create a timeout promise to prevent hanging
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Queue position fetch timeout')), CONNECTION_TIMEOUT);
          });
          
          // Convex API call with timeout
          const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
          if (!convexUrl) {
            throw new Error('NEXT_PUBLIC_CONVEX_URL not configured');
          }
          
          const fetchPromise = fetch(`${convexUrl}/api/query`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              path: 'waitingList:getQueuePosition',
              args: { eventId, userId }
            }),
            signal: AbortSignal.timeout(CONNECTION_TIMEOUT - 1000) // 7 second timeout
          });
          
          const response = await Promise.race([fetchPromise, timeoutPromise]);
          
          if (!response.ok) {
            throw new Error(`Convex API returned ${response.status}: ${response.statusText}`);
          }
          
          const convexResponse = await response.json();
          const result = convexResponse.status === 'success' ? convexResponse.value : convexResponse;
          
          // Enhance the response with additional metadata
          const enhancedResult = {
            ...result,
            timestamp: Date.now(),
            eventId,
            userId,
            // Add estimated waiting time if in queue
            waitingTimeEstimate: result?.position ? calculateWaitingTime(result.position) : null,
            dataSource: 'convex'
          };
          
          return enhancedResult;
        } catch (error) {
          console.error(`[queue-position] Convex query failed for event ${eventId}, user ${userId}:`, error.message);
          
          // Return structured fallback response instead of throwing
          return {
            position: null,
            inQueue: false,
            queueSize: 0,
            eventId,
            userId,
            timestamp: Date.now(),
            waitingTimeEstimate: null,
            error: 'Unable to fetch current queue position',
            dataSource: 'fallback'
          };
        }
      },
      CACHE_CONFIGS.REALTIME_DATA // Use REALTIME_DATA config for queue positions
    );
    
    const responseTime = Math.round(performance.now() - startTime);
    
    // Determine cache control based on queue status
    const cacheControl = queueData?.inQueue 
      ? 'public, max-age=30, s-maxage=15' // Short cache for active queue members
      : 'public, max-age=120, s-maxage=60'; // Longer cache for non-queue users
    
    return NextResponse.json(queueData || getDefaultQueueResponse(eventId, userId), {
      status: 200,
      headers: {
        'Cache-Control': cacheControl,
        'X-Data-Source': queueData?.dataSource || 'cached',
        'X-Response-Time': `${responseTime}ms`,
        'X-Queue-Status': queueData?.inQueue ? 'active' : 'inactive'
      }
    });
    
  } catch (error) {
    const responseTime = Math.round(performance.now() - startTime);
    console.error('[queue-position] Unexpected error:', error);
    
    // Always return a valid response, never throw 500s for queue position
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId') || 'unknown';
    const userId = searchParams.get('userId') || 'unknown';
    
    return NextResponse.json(getDefaultQueueResponse(eventId, userId, error.message), {
      status: 200, // Always return 200 for better UX
      headers: {
        'X-Data-Source': 'error-fallback',
        'X-Response-Time': `${responseTime}ms`,
        'Cache-Control': 'no-cache'
      }
    });
  } finally {
    activeConnections--;
  }
}

// Calculate estimated waiting time based on position
function calculateWaitingTime(position: number): string | null {
  if (!position || position <= 0) return null;
  
  // Rough estimates based on typical processing rates
  // Assuming 1 ticket processed every 30 seconds during peak times
  const estimatedMinutes = Math.ceil(position * 0.5); // 30 seconds per position
  
  if (estimatedMinutes < 1) {
    return 'Less than 1 minute';
  } else if (estimatedMinutes < 60) {
    return `About ${estimatedMinutes} minute${estimatedMinutes > 1 ? 's' : ''}`;
  } else {
    const hours = Math.floor(estimatedMinutes / 60);
    const minutes = estimatedMinutes % 60;
    return `About ${hours} hour${hours > 1 ? 's' : ''}${minutes > 0 ? ` ${minutes} minute${minutes > 1 ? 's' : ''}` : ''}`;
  }
}

// Get default response structure
function getDefaultQueueResponse(eventId: string, userId: string, errorMessage?: string) {
  return {
    position: null,
    inQueue: false,
    queueSize: 0,
    eventId,
    userId,
    timestamp: Date.now(),
    waitingTimeEstimate: null,
    error: errorMessage || 'Queue position temporarily unavailable',
    dataSource: 'default'
  };
}
