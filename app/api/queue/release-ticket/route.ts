import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL || '');

export async function POST(request: NextRequest) {
  try {
    // Get the reservation ID from the query parameters
    const reservationId = request.nextUrl.searchParams.get('id');
    
    if (!reservationId) {
      return NextResponse.json({ error: 'Reservation ID is required' }, { status: 400 });
    }
    
    console.log(`[release-ticket] Releasing reservation ${reservationId}`);
    
    // Call Convex to release the ticket reservation
    // Use the releaseTickets mutation from Convex
    await convex.mutation(api.releaseTickets.releaseTicket, { 
      reservationId,
      userId: "system" // When releasing from API, use system as the user ID
    });
    
    console.log(`[release-ticket] Successfully released reservation ${reservationId}`);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Ticket released successfully' 
    });
  } catch (error) {
    console.error('[release-ticket] Error releasing ticket:', error);
    return NextResponse.json(
      { 
        error: 'Failed to release ticket', 
        message: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}
