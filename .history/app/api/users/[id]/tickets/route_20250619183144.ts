import { NextRequest, NextResponse } from 'next/server';
import { withCache } from '@/lib/cache';
import { REDIS_TTL } from '@/lib/redis';

// Use direct Convex API calls instead of ConvexHttpClient
const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || '';

export async function GET(request: NextRequest) {
  // Extract the ID from the URL pathname
  const pathname = request.nextUrl.pathname;
  const id = pathname.split('/')[3] || ''; // Get the user ID segment (users/[id]/tickets)
  
  if (!id) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get('eventId');
  
  if (!eventId) {
    return NextResponse.json(
      { error: 'Event ID is required' },
      { status: 400 }
    );
  }

  try {
    // Aggressive caching - 5 minutes for user tickets (reduced from 2 hours)
    const cacheKey = `user:${id}:event:${eventId}:tickets:v2`;
    const ticket = await withCache(
      cacheKey,
      async () => {
        // Direct Convex API call instead of ConvexHttpClient
        const response = await fetch(`${convexUrl}/api/query`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            path: 'tickets:getUserTicketForEvent',
            args: { userId: id, eventId }
          }),
        });

        if (!response.ok) {
          throw new Error(`Convex API returned ${response.status}`);
        }

        const convexResponse = await response.json();
        
        // Convex wraps responses in {status: "success", value: actualData}
        const result = convexResponse.status === 'success' ? convexResponse.value : convexResponse;
        
        return result;
      },
      { ttl: 60 * 5 } // 5 minutes cache for user tickets
    );
    
    return NextResponse.json(ticket, { 
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=300', // 5 minutes browser cache
      }
    });
  } catch (error) {
    console.error('Failed to fetch user ticket with cache:', error);
    
    try {
      // Direct fallback with fetch instead of ConvexHttpClient
      const response = await fetch(`${convexUrl}/api/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          path: 'tickets:getUserTicketForEvent',
          args: { userId: id, eventId }
        }),
      });

      if (!response.ok) {
        throw new Error(`Convex fallback API returned ${response.status}`);
      }

      const convexResponse = await response.json();
      const result = convexResponse.status === 'success' ? convexResponse.value : convexResponse;
      
      return NextResponse.json(result, { status: 200 });
    } catch (convexError) {
      console.error('Failed to fetch user ticket directly:', convexError);
      
      // Return null instead of error for better UX
      return NextResponse.json(null, { 
        status: 200,
        headers: {
          'Cache-Control': 'no-cache', // Don't cache errors
        }
      });
    }
  }
}
