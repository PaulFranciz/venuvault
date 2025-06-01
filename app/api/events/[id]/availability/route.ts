import { NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';
import { withCache } from '@/lib/cache';
import { redisKeys, REDIS_TTL } from '@/lib/redis';

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL || '');

export async function GET(
  request: Request,
  context: { params: { id: string } }
) {
  // First, await the params to access them safely in Next.js 15
  const { id } = await context.params;
  
  try {
    // Server-side Redis cache with fallback to Convex
    const availability = await withCache(
      redisKeys.eventAvailability(id),
      async () => {
        // This only runs on cache miss
        return await convex.query(api.events.getEventAvailability, { 
          eventId: id as any // Cast to any to address TypeScript error with Convex ID type
        });
      },
      { ttl: REDIS_TTL.AVAILABILITY } // Short TTL for availability data
    );
    
    return NextResponse.json(availability, { status: 200 });
  } catch (error) {
    console.error('Failed to fetch availability:', error);
    try {
      // Direct fallback to Convex if Redis fails
      const availability = await convex.query(api.events.getEventAvailability, { 
        eventId: id as any // Cast to any to address TypeScript error with Convex ID type
      });
      return NextResponse.json(availability, { status: 200 });
    } catch (convexError) {
      return NextResponse.json(
        { error: 'Failed to fetch event availability' },
        { status: 500 }
      );
    }
  }
}
