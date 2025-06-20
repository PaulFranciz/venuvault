import { NextRequest, NextResponse } from 'next/server';
import { withCache } from '@/lib/cache';
import { withAdvancedCache, CACHE_CONFIGS } from '@/lib/advanced-cache';
import { REDIS_TTL } from '@/lib/redis';

// Use direct Convex API calls instead of ConvexHttpClient
const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || '';

export async function GET(request: NextRequest) {
  const startTime = performance.now();
  
  // Extract the ID from the URL pathname
  const pathname = request.nextUrl.pathname;
  const id = pathname.split('/')[3] || ''; // Get the user ID segment (users/[id]/tickets)
  
  if (!id) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get('eventId');
  
  // If no eventId provided, get all user tickets
  if (!eventId) {
    return getUserAllTickets(id, startTime);
  }
  
  // Get tickets for specific event
  return getUserEventTickets(id, eventId, startTime);
}

// Get all tickets for a user (across all events)
async function getUserAllTickets(userId: string, startTime: number) {
  try {
    // Aggressive caching - 2 minutes for all user tickets
    const cacheKey = `user:${userId}:all-tickets:v3`;
    const tickets = await withCache(
      cacheKey,
      async () => {
        const response = await fetch(`${convexUrl}/api/query`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            path: 'tickets:getUserTickets',
            args: { userId }
          }),
        });

        if (!response.ok) {
          throw new Error(`Convex API returned ${response.status}`);
        }

        const convexResponse = await response.json();
        const result = convexResponse.status === 'success' ? convexResponse.value : convexResponse;
        
        // Ensure we always return an array
        return Array.isArray(result) ? result : (result ? [result] : []);
      },
      { ttl: 60 * 2 } // 2 minutes cache
    );
    
    const duration = Math.round(performance.now() - startTime);
    
    return NextResponse.json(tickets || [], { 
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=120', // 2 minutes browser cache
        'X-Data-Source': 'convex-cached',
        'X-Response-Time': `${duration}ms`
      }
    });
  } catch (error) {
    console.error('Failed to fetch all user tickets:', error);
    return handleTicketsError(userId, null, startTime);
  }
}

// Get tickets for a specific event
async function getUserEventTickets(userId: string, eventId: string, startTime: number) {
  try {
    // Aggressive caching - 3 minutes for user event tickets
    const cacheKey = `user:${userId}:event:${eventId}:tickets:v3`;
    const tickets = await withCache(
      cacheKey,
      async () => {
        // Try to get all user tickets first (might be cached)
        const allTicketsResponse = await fetch(`${convexUrl}/api/query`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            path: 'tickets:getUserTickets',
            args: { userId }
          }),
        });

        if (!allTicketsResponse.ok) {
          throw new Error(`Convex API returned ${allTicketsResponse.status}`);
        }

        const convexResponse = await allTicketsResponse.json();
        const allTickets = convexResponse.status === 'success' ? convexResponse.value : convexResponse;
        
        // Filter for the specific event
        const eventTickets = Array.isArray(allTickets) 
          ? allTickets.filter(ticket => ticket.eventId === eventId)
          : (allTickets && allTickets.eventId === eventId ? [allTickets] : []);
        
        return eventTickets;
      },
      { ttl: 60 * 3 } // 3 minutes cache for event-specific tickets
    );
    
    const duration = Math.round(performance.now() - startTime);
    
    return NextResponse.json({
      tickets: tickets || [],
      eventId,
      count: tickets?.length || 0
    }, { 
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=180', // 3 minutes browser cache
        'X-Data-Source': 'convex-cached',
        'X-Response-Time': `${duration}ms`
      }
    });
  } catch (error) {
    console.error('Failed to fetch user event tickets:', error);
    return handleTicketsError(userId, eventId, startTime);
  }
}

// Handle errors with fallback responses
async function handleTicketsError(userId: string, eventId: string | null, startTime: number) {
  const duration = Math.round(performance.now() - startTime);
  
  try {
    // Try direct fallback with simplified query
    const response = await fetch(`${convexUrl}/api/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        path: eventId ? 'tickets:getUserTicketForEvent' : 'tickets:getUserTickets',
        args: eventId ? { userId, eventId } : { userId }
      }),
      // Add timeout to prevent hanging
      signal: AbortSignal.timeout(5000)
    });

    if (!response.ok) {
      throw new Error(`Convex fallback API returned ${response.status}`);
    }

    const convexResponse = await response.json();
    const result = convexResponse.status === 'success' ? convexResponse.value : convexResponse;
    
    // Format response consistently
    if (eventId) {
      // For event-specific request, return object with tickets array
      const tickets = result ? [result] : [];
      return NextResponse.json({
        tickets,
        eventId,
        count: tickets.length
      }, { 
        status: 200,
        headers: {
          'X-Data-Source': 'convex-fallback',
          'X-Response-Time': `${duration}ms`,
          'Cache-Control': 'no-cache'
        }
      });
    } else {
      // For all tickets request, return array
      const tickets = Array.isArray(result) ? result : (result ? [result] : []);
      return NextResponse.json(tickets, { 
        status: 200,
        headers: {
          'X-Data-Source': 'convex-fallback',
          'X-Response-Time': `${duration}ms`,
          'Cache-Control': 'no-cache'
        }
      });
    }
  } catch (convexError) {
    console.error('Failed to fetch user tickets directly:', convexError);
    
    // Return proper empty response structure
    if (eventId) {
      return NextResponse.json({
        tickets: [],
        eventId,
        count: 0,
        error: 'Unable to fetch tickets'
      }, { 
        status: 200,
        headers: {
          'X-Data-Source': 'mock-fallback',
          'X-Response-Time': `${duration}ms`,
          'Cache-Control': 'no-cache'
        }
      });
    } else {
      return NextResponse.json([], { 
        status: 200,
        headers: {
          'X-Data-Source': 'mock-fallback',
          'X-Response-Time': `${duration}ms`,
          'Cache-Control': 'no-cache'
        }
      });
    }
  }
}
