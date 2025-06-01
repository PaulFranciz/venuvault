import { NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';
import { withCache } from '@/lib/cache';
import { REDIS_TTL } from '@/lib/redis';

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL || '');

export async function GET(
  request: Request,
  context: { params: { id: string } }
) {
  // First, await the params to access them safely in Next.js 15
  const { id } = await context.params;

  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get('eventId');
  
  if (!eventId) {
    return NextResponse.json(
      { error: 'Event ID is required' },
      { status: 400 }
    );
  }

  try {
    // Server-side Redis cache with fallback to Convex
    const cacheKey = `user:${id}:event:${eventId}:ticket`;
    const ticket = await withCache(
      cacheKey,
      async () => {
        // This only runs on cache miss
        return await convex.query(api.tickets.getUserTicketForEvent, { 
          userId: id,
          eventId: eventId as any
        });
      },
      { ttl: REDIS_TTL.USER }
    );
    
    return NextResponse.json(ticket, { status: 200 });
  } catch (error) {
    console.error('Failed to fetch user ticket with cache:', error);
    try {
      // Direct fallback to Convex if Redis fails
      const ticket = await convex.query(api.tickets.getUserTicketForEvent, { 
        userId: id,
        eventId: eventId as any
      });
      return NextResponse.json(ticket, { status: 200 });
    } catch (convexError) {
      console.error('Failed to fetch user ticket directly:', convexError);
      return NextResponse.json(
        { error: 'Failed to fetch user ticket' },
        { status: 500 }
      );
    }
  }
}
