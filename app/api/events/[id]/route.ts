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
    // Use Redis cache with fallback to Convex
    const event = await withCache(
      redisKeys.event(id),
      async () => {
        // This only runs on cache miss
        return await convex.query(api.events.getById, { eventId: id as any });
      },
      { ttl: REDIS_TTL.EVENT }
    );
    
    return NextResponse.json(event, { status: 200 });
  } catch (error) {
    console.error('Failed to fetch event:', error);
    try {
      // Fallback to direct Convex if Redis fails
      const event = await convex.query(api.events.getById, { eventId: id as any });
      return NextResponse.json(event, { status: 200 });
    } catch (convexError) {
      return NextResponse.json(
        { error: 'Failed to fetch event details' },
        { status: 500 }
      );
    }
  }
}
