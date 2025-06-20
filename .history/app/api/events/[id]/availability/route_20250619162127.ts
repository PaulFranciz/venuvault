import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';
import { withCache } from '@/lib/cache';
import { redisKeys, REDIS_TTL } from '@/lib/redis';

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL || '');

// Mock data to use when Convex fails
const generateMockAvailability = (eventId: string) => {
  // Return a sensible default structure that matches what the frontend expects
  return {
    eventId,
    isSoldOut: false,
    totalTickets: 100,
    purchasedCount: 65,
    activeOffers: 10,
    remainingTickets: 25,
    status: 'ON_SALE',
    isMockData: true // Flag to indicate this is mock data
  };
};

export async function GET(request: NextRequest) {
  // Extract the ID from the URL pathname
  const pathname = request.nextUrl.pathname;
  const id = pathname.split('/').pop() || ''; // Get the last segment of the path

  if (!id) {
    return NextResponse.json({ error: 'ID is required' }, { status: 400 });
  }
  
  // Check for query parameters
  const forceMock = request.nextUrl.searchParams.get('mock-data') === 'true';
  const bypassCache = request.nextUrl.searchParams.get('bypass-cache') === 'true';
  
  // If mock data is requested, return it immediately
  if (forceMock) {
    console.log(`[availability] Returning mock data for event ${id} (forced)`);
    return NextResponse.json(generateMockAvailability(id), { 
      status: 200,
      headers: { 'X-Data-Source': 'mock-forced' }
    });
  }

  // Try Redis cache first (original flow)
  try {
    // Server-side Redis cache with improved error handling
    console.log(`[availability] Attempting cached query for event availability`);
    const availability = await withCache(
      redisKeys.eventAvailability(id),
      async () => {
        // This only runs on cache miss
        console.log(`[availability] Cache miss for event availability, fetching from Convex`);
        try {
          // Use ConvexHttpClient as primary method
          return await convex.query(api.events.getEventAvailability, { 
            eventId: id as any 
          });
        } catch (convexQueryError) {
          console.error(`[availability] Convex query failed during cache operation for event ${id}:`, convexQueryError);
          // Return mock data when Convex fails during cache operation
          return generateMockAvailability(id);
        }
      },
      { ttl: REDIS_TTL.AVAILABILITY } // Short TTL for availability data
    );
    
    return NextResponse.json(availability, { 
      status: 200,
      headers: { 'X-Data-Source': availability.isMockData ? 'mock-from-cache' : 'cache' }
    });
  } catch (error) {
    console.error(`[availability] Cache operation failed for event ${id}:`, error);
    
    // If Redis fails, try direct Convex query
    try {
      console.log(`[availability] Attempting direct Convex query after cache failure for event ${id}`);
      const availability = await convex.query(api.events.getEventAvailability, { 
        eventId: id as any 
      });
      return NextResponse.json(availability, { 
        status: 200,
        headers: { 'X-Data-Source': 'direct-convex-fallback' }
      });
    } catch (directError) {
      console.error(`[availability] Direct Convex query failed for event ${id}:`, directError);
      // As a last resort, return mock data
      const mockData = generateMockAvailability(id);
      console.log(`[availability] Returning mock data as absolute last resort`);
      return NextResponse.json(mockData, { 
        status: 200,
        headers: { 'X-Data-Source': 'mock-absolute-fallback' }
      });
    }
  }
}
