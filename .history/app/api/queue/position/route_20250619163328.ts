import { NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';
import { withCache } from '@/lib/cache';
import { REDIS_TTL } from '@/lib/redis';

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL || '');

export async function GET(request: Request) {
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
    // Server-side Redis cache with fallback to Convex
    const cacheKey = `queue:${eventId}:user:${userId}`;
    const queuePosition = await withCache(
      cacheKey,
      async () => {
        // This only runs on cache miss
        return await convex.query(api.waitingList.getQueuePosition, { 
          eventId: eventId as any,
          userId: userId
        });
      },
      { ttl: 60 } // 1 minute TTL for queue position (needs to be relatively fresh)
    );
    
    return NextResponse.json(queuePosition, { status: 200 });
  } catch (error) {
    console.error('Failed to fetch queue position with cache:', error);
    try {
      // Direct fallback to Convex if Redis fails
      const queuePosition = await convex.query(api.waitingList.getQueuePosition, { 
        eventId: eventId as any,
        userId: userId
      });
      return NextResponse.json(queuePosition, { status: 200 });
    } catch (convexError) {
      console.error('Failed to fetch queue position directly:', convexError);
      return NextResponse.json(
        { error: 'Failed to fetch queue position' },
        { status: 500 }
      );
    }
  }
}
