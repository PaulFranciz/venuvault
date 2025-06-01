import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';
import { withCache } from '@/lib/cache';
import { redisKeys, REDIS_TTL } from '@/lib/redis';

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL || '');

export async function GET(request: NextRequest) {
  // Extract the ID from the URL pathname
  const pathname = request.nextUrl.pathname;
  const id = pathname.split('/').pop() || ''; // Get the last segment of the path

  if (!id) {
    return NextResponse.json({ error: 'ID is required' }, { status: 400 });
  }
  
  // Check for a bypass-cache query parameter for testing
  const bypassCache = request.nextUrl.searchParams.get('bypass-cache') === 'true';
  
  if (bypassCache) {
    try {
      // Direct Convex query - skip cache entirely
      console.log(`[availability] Bypassing cache for event ${id}`);
      const availability = await convex.query(api.events.getEventAvailability, { 
        eventId: id as any // Cast to any to address TypeScript error with Convex ID type
      });
      return NextResponse.json(availability, { status: 200 });
    } catch (directError) {
      console.error(`[availability] Direct query failed for event ${id}:`, directError);
      return NextResponse.json(
        { error: 'Failed to fetch event availability directly', message: directError instanceof Error ? directError.message : String(directError) },
        { status: 500 }
      );
    }
  }
  
  try {
    // Server-side Redis cache with fallback to Convex
    console.log(`[availability] Attempting cached query for event ${id}`);
    const availability = await withCache(
      redisKeys.eventAvailability(id),
      async () => {
        // This only runs on cache miss
        console.log(`[availability] Cache miss for event ${id}, fetching from Convex`);
        try {
          return await convex.query(api.events.getEventAvailability, { 
            eventId: id as any // Cast to any to address TypeScript error with Convex ID type
          });
        } catch (convexQueryError) {
          console.error(`[availability] Convex query failed during cache operation for event ${id}:`, convexQueryError);
          throw convexQueryError; // Rethrow to trigger the outer catch
        }
      },
      { ttl: REDIS_TTL.AVAILABILITY } // Short TTL for availability data
    );
    
    return NextResponse.json(availability, { status: 200 });
  } catch (error) {
    console.error(`[availability] Cache operation failed for event ${id}:`, error);
    try {
      // Direct fallback to Convex if Redis fails
      console.log(`[availability] Attempting direct fallback query for event ${id}`);
      const availability = await convex.query(api.events.getEventAvailability, { 
        eventId: id as any // Cast to any to address TypeScript error with Convex ID type
      });
      return NextResponse.json(availability, { status: 200 });
    } catch (convexError) {
      console.error(`[availability] Fallback query failed for event ${id}:`, convexError);
      return NextResponse.json(
        { error: 'Failed to fetch event availability', message: convexError instanceof Error ? convexError.message : String(convexError) },
        { status: 500 }
      );
    }
  }
}
