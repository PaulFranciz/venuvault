import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';
import { withCache } from '@/lib/cache';
import { redisKeys, REDIS_TTL } from '@/lib/redis';

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL || '');

export async function GET(request: NextRequest) {
  const startTime = performance.now();
  
  // Extract the ID from the URL pathname
  const pathname = request.nextUrl.pathname;
  const id = pathname.split('/').pop() || ''; // Get the last segment of the path
  
  if (!id) {
    return NextResponse.json({ error: 'ID is required' }, { status: 400 });
  }
  
  try {
    // Use Redis cache with fallback to Convex - fixed Redis key reference
    const event = await withCache(
      redisKeys.eventDetails(id), // Fixed: use eventDetails instead of event
      async () => {
        // This only runs on cache miss
        return await convex.query(api.events.getById, { eventId: id as any });
      },
      { ttl: REDIS_TTL.EVENT_DETAILS } // Fixed: use EVENT_DETAILS instead of EVENT
    );
    
    const duration = Math.round(performance.now() - startTime);
    
    return NextResponse.json(event, { 
      status: 200,
      headers: {
        'X-Data-Source': 'convex-cached',
        'X-Response-Time': `${duration}ms`,
        'Cache-Control': `public, max-age=${REDIS_TTL.EVENT_DETAILS}`
      }
    });
  } catch (error) {
    console.error('Failed to fetch event:', error);
    const duration = Math.round(performance.now() - startTime);
    
    try {
      // Fallback to direct Convex if Redis fails
      const event = await convex.query(api.events.getById, { eventId: id as any });
      return NextResponse.json(event, { 
        status: 200,
        headers: {
          'X-Data-Source': 'convex-fallback',
          'X-Response-Time': `${duration}ms`,
          'Cache-Control': 'no-cache'
        }
      });
    } catch (convexError) {
      console.error('Convex fallback also failed:', convexError);
      return NextResponse.json(
        { 
          error: 'Failed to fetch event details',
          eventId: id,
          timestamp: Date.now()
        },
        { 
          status: 500,
          headers: {
            'X-Data-Source': 'error',
            'X-Response-Time': `${duration}ms`
          }
        }
      );
    }
  }
}
