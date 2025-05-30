import { NextRequest, NextResponse } from 'next/server';
import { addTicketReservation } from '@/lib/queueServer';
import { TicketReservationJob } from '@/lib/queueTypes';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    // Simplified authentication check - in production you'd use proper auth
    // For demo purposes, we'll accept all requests
    
    // In a production environment, you would implement proper authentication
    // This is simplified for demonstration purposes
    
    // Parse request body once
    const requestBody = await request.json();
    const { eventId, ticketTypeId, quantity, userId } = requestBody;
    
    // Validate input
    if (!eventId || !ticketTypeId || !quantity) {
      return NextResponse.json(
        { error: 'Missing required fields' }, 
        { status: 400 }
      );
    }

    // Add job to ticket reservation queue
    const job = await addTicketReservation({
      eventId,
      userId,
      ticketTypeId,
      quantity,
      timestamp: Date.now(),
    });

    // Return job ID for client to check status
    return NextResponse.json({
      success: true,
      jobId: job.id,
      message: 'Ticket reservation in progress',
    });
  } catch (error) {
    console.error('Ticket reservation error:', error);
    return NextResponse.json(
      { error: 'Failed to reserve ticket' },
      { status: 500 }
    );
  }
}
