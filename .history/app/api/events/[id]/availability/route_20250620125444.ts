import { NextRequest, NextResponse } from 'next/server';
import { withCache } from '@/lib/cache';
import { redisKeys, REDIS_TTL } from '@/lib/redis';

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
  const id = pathname.split('/')[3]; // /api/events/[id]/availability

  if (!id) {
    return NextResponse.json(
      { error: 'Event ID is required' },
      { status: 400 }
    );
  }
  
  console.log(`[availability] Processing request for event: ${id}`);

  // Function to call Convex API directly (more reliable than ConvexHttpClient)
  const fetchFromConvex = async (eventId: string) => {
    try {
      const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
      if (!convexUrl) {
        throw new Error('NEXT_PUBLIC_CONVEX_URL not configured');
      }
      
      // Create an AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout

      const response = await fetch(`${convexUrl}/api/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          path: 'events:getEventAvailability',
          args: { eventId }
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Convex API returned ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (result.status === 'success') {
        return result.value;
      } else {
        throw new Error(`Convex query failed: ${result.error?.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error(`[availability] Convex API call failed for event ${eventId}:`, error);
      throw error;
    }
  };
  
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
          // Use direct Convex API call instead of ConvexHttpClient
          return await fetchFromConvex(id);
        } catch (convexQueryError) {
          console.error(`[availability] Convex query failed during cache operation for event ${id}:`, convexQueryError);
          // Return mock data when Convex fails during cache operation
          return generateMockAvailability(id);
        }
      },
      { ttl: REDIS_TTL.AVAILABILITY } // Short TTL for availability data
    );
    
    const response = NextResponse.json(availability, { status: 200 });
    response.headers.set('X-Data-Source', availability.isMockData ? 'mock-from-cache' : 'convex-cached');
    return response;
    
  } catch (error) {
    console.error(`[availability] Cache operation failed for event ${id}:`, error);
    
    // If Redis fails, try direct Convex query
    try {
      console.log(`[availability] Attempting direct Convex query after cache failure for event ${id}`);
      const availability = await fetchFromConvex(id);
      
      const response = NextResponse.json(availability, { status: 200 });
      response.headers.set('X-Data-Source', 'convex-direct-fallback');
      return response;
      
    } catch (directError) {
      console.error(`[availability] Direct Convex query failed for event ${id}:`, directError);
        // As a last resort, return mock data
        const mockData = generateMockAvailability(id);
        console.log(`[availability] Returning mock data as absolute last resort`);
      
      const response = NextResponse.json(mockData, { status: 200 });
      response.headers.set('X-Data-Source', 'mock-absolute-fallback');
      return response;
    }
  }
}
