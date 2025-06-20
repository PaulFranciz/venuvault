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
  
  console.log(`[EVENT API] Processing request for event: ${id}`);
  
  if (!id) {
    return NextResponse.json({ error: 'ID is required' }, { status: 400 });
  }

  // Validate Convex environment
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
    console.error('[EVENT API] NEXT_PUBLIC_CONVEX_URL not configured');
    return NextResponse.json(
      { error: 'Server configuration error' },
      { status: 500 }
    );
  }
  
  try {
    // Use Redis cache with fallback to Convex - fixed Redis key reference
    const event = await withCache(
      redisKeys.eventDetails(id), // Fixed: use eventDetails instead of event
      async () => {
        // This only runs on cache miss
        console.log(`[EVENT API] Cache miss for event: ${id}, querying Convex`);
        
        // Validate ID format (Convex IDs are typically long strings)
        if (!id || id.length < 10) {
          throw new Error(`Invalid event ID format: ${id}`);
        }
        
        const result = await convex.query(api.events.getById, { eventId: id as any });
        console.log(`[EVENT API] Convex query successful for event: ${id}`);
        return result;
      },
      { ttl: REDIS_TTL.EVENT_DETAILS } // Fixed: use EVENT_DETAILS instead of EVENT
    );
    
    if (!event) {
      console.log(`[EVENT API] Event not found: ${id}`);
      return NextResponse.json(
        { error: 'Event not found', eventId: id },
        { status: 404 }
      );
    }
    
    const duration = Math.round(performance.now() - startTime);
    console.log(`[EVENT API] Successfully fetched event: ${id} in ${duration}ms`);
    
    return NextResponse.json(event, { 
      status: 200,
      headers: {
        'X-Data-Source': 'convex-cached',
        'X-Response-Time': `${duration}ms`,
        'Cache-Control': `public, max-age=${REDIS_TTL.EVENT_DETAILS}`
      }
    });
  } catch (error) {
    console.error(`[EVENT API] Cache fetch failed for event ${id}:`, error);
    const duration = Math.round(performance.now() - startTime);
    
    try {
      console.log(`[EVENT API] Attempting direct Convex fallback for event: ${id}`);
      
      // Validate ID format before fallback
      if (!id || id.length < 10) {
        throw new Error(`Invalid event ID format: ${id}`);
      }
      
      // Fallback to direct Convex if Redis fails
      const event = await convex.query(api.events.getById, { eventId: id as any });
      
      if (!event) {
        return NextResponse.json(
          { error: 'Event not found', eventId: id },
          { status: 404 }
        );
      }
      
      console.log(`[EVENT API] Convex fallback successful for event: ${id}`);
      
      return NextResponse.json(event, { 
        status: 200,
        headers: {
          'X-Data-Source': 'convex-fallback',
          'X-Response-Time': `${duration}ms`,
          'Cache-Control': 'no-cache'
        }
      });
    } catch (convexError) {
      console.error(`[EVENT API] Convex fallback also failed for event ${id}:`, convexError);
      
      // Check if it's a "not found" vs "server error"
      const errorMessage = convexError instanceof Error ? convexError.message : String(convexError);
      const isNotFound = errorMessage.includes('not found') || errorMessage.includes('null');
      
      return NextResponse.json(
        { 
          error: isNotFound ? 'Event not found' : 'Failed to fetch event details',
          eventId: id,
          timestamp: Date.now(),
          details: errorMessage
        },
        { 
          status: isNotFound ? 404 : 500,
          headers: {
            'X-Data-Source': 'error',
            'X-Response-Time': `${duration}ms`
          }
        }
      );
    }
  }
}
