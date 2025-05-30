import { NextRequest, NextResponse } from 'next/server';
import { createRedisClient } from '@/lib/redis';
import { verifyQStashSignature } from '@/lib/qstash';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';
import { QUEUES } from '@/lib/queue';

/**
 * This endpoint is called by QStash when a ticket reservation
 * needs to be processed as a fallback/redundant path
 */
export async function POST(request: NextRequest) {
  try {
    // Verify QStash signature for security
    const signature = request.headers.get('upstash-signature') || '';
    const rawBody = await request.text();
    
    const isValid = await verifyQStashSignature(signature, rawBody);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
    
    // Parse body
    const body = JSON.parse(rawBody);
    const { eventId, ticketTypeId, quantity, userId, bullmqJobId } = body;
    
    if (!eventId || !userId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    console.log('Processing QStash ticket reservation:', body);
    
    // Check if BullMQ already processed this job (if a BullMQ job ID was provided)
    if (bullmqJobId) {
      const redis = createRedisClient();
      const jobStatusKey = `job:${QUEUES.TICKET_RESERVATION}:${bullmqJobId}:status`;
      const jobStatus = await redis.get(jobStatusKey);
      
      if (jobStatus && JSON.parse(jobStatus).state === 'completed') {
        console.log('Job already processed by BullMQ:', bullmqJobId);
        return NextResponse.json({ status: 'already_processed_by_bullmq', jobId: bullmqJobId });
      }
    }
    
    // Process the ticket reservation directly via Convex
    // Initialize Convex HTTP client
    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL || '');
    
    // Call the Convex API to join the waiting list
    const result = await convex.mutation(api.events.joinWaitingList, {
      eventId,
      userId,
      ticketTypeId,
      quantity: quantity || 1,
    });
    
    console.log('QStash reservation processed successfully:', result);
    
    // Update job status in Redis if we have a BullMQ job ID
    if (bullmqJobId) {
      const redis = createRedisClient();
      const jobStatusKey = `job:${QUEUES.TICKET_RESERVATION}:${bullmqJobId}:status`;
      await redis.set(jobStatusKey, JSON.stringify({
        state: 'completed',
        result: { qstashProcessed: true, waitingListEntry: result },
        processedAt: Date.now(),
      }));
    }
    
    // Return success response
    return NextResponse.json({ 
      success: true, 
      message: 'Ticket reservation processed by QStash',
      result
    });
  } catch (error) {
    console.error('QStash ticket reservation error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process ticket reservation', 
        message: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}

// Disable body parsing since we need the raw body for signature verification
export const config = {
  api: {
    bodyParser: false,
  },
};
