import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import { sendToQStash } from '@/lib/qstash';

/**
 * This endpoint receives ticket reservation data and sends it to QStash
 * as a backup/redundant processing path.
 * 
 * Unlike directly calling QStash, this allows us to:
 * 1. Authenticate the user first
 * 2. Apply any business logic before sending to QStash
 * 3. Return a consistent response format to the client
 */
export async function POST(request: NextRequest) {
  try {
    // Verify user authentication
    const { userId } = getAuth(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { eventId, ticketTypeId, quantity, bullmqJobId } = body;
    
    if (!eventId || !ticketTypeId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Create the payload for QStash
    const payload = {
      eventId,
      ticketTypeId,
      quantity: quantity || 1,
      userId, // Use the authenticated user ID
      bullmqJobId, // For deduplication with BullMQ
      timestamp: Date.now()
    };
    
    // Send to QStash with a delay to allow BullMQ to process first
    const result = await sendToQStash(
      '/api/qstash/reserve-ticket',
      payload,
      {
        delay: 30, // 30 second delay
        deduplicationId: bullmqJobId ? `ticket-reservation-${bullmqJobId}` : undefined,
      }
    );
    
    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      message: 'Ticket reservation backup queued via QStash'
    });
  } catch (error) {
    console.error('QStash backup reservation error:', error);
    return NextResponse.json(
      { error: 'Failed to queue backup reservation', message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
