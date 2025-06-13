import { NextRequest, NextResponse } from 'next/server';
import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { ConvexHttpClient } from 'convex/browser';

// Import API endpoints - adapt as needed for your specific Convex setup
import { api } from '@/convex/_generated/api';

// This token is used to prevent unauthorized access to this endpoint
// It should match the token used in your cron job configuration
const CRON_SECRET = process.env.API_SECRET_TOKEN;

// Token validation function
const validateToken = (request: NextRequest) => {
  if (!CRON_SECRET) {
    console.error('API_SECRET_TOKEN environment variable is not set');
    return false;
  }
  
  // Check for token in multiple places (query param, headers)
  const queryToken = request.nextUrl.searchParams.get('token');
  const authHeader = request.headers.get('Authorization');
  const apiKeyHeader = request.headers.get('x-api-key');
  
  // Extract Bearer token if present
  const bearerToken = authHeader?.startsWith('Bearer ') 
    ? authHeader.substring(7) 
    : null;
  
  // Check if any of the tokens match
  return [
    queryToken,
    bearerToken,
    apiKeyHeader
  ].some(token => token && token === CRON_SECRET);
};

// Queue names
const QUEUES = {
  TICKET_RESERVATION: 'ticketReservation',
  PAYMENT_PROCESSING: 'paymentProcessing',
  NOTIFICATION: 'notification',
  WAITLIST_PROCESSING: 'waitlistProcessing',
};

// Vercel serverless functions have a maximum execution time of 10-60 seconds
// We'll process jobs for a shorter duration to ensure we don't exceed limits
const MAX_EXECUTION_TIME = 25 * 1000; // 25 seconds
const startTime = Date.now();

// BullMQ connection options for Vercel
const getBullMQConnectionOpts = () => {
  // Use environment variables for production
  const redisUrl = process.env.REDIS_URL || 
    "rediss://default:AS1gAAIjcDFiN2M5YjQ4MDY0MWM0NTRiOTE3M2U0NDJkNjYxODZiMXAxMA@tops-mudfish-11616.upstash.io:6379";
  
  // Parse Redis URL for connection options
  const url = new URL(redisUrl);
  const host = url.hostname;
  const port = parseInt(url.port || "6379");
  const password = url.password || "AS1gAAIjcDFiN2M5YjQ4MDY0MWM0NTRiOTE3M2U0NDJkNjYxODZiMXAxMA";
  const username = url.username || "default";
  
  return {
    connection: {
      host,
      port,
      username,
      password,
      tls: { rejectUnauthorized: false },
      maxRetriesPerRequest: null, // Required by BullMQ
    }
  };
};

// Create Convex HTTP client for API calls
const getConvexClient = () => {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    throw new Error('NEXT_PUBLIC_CONVEX_URL is not defined');
  }
  return new ConvexHttpClient(convexUrl);
};

// Process jobs in the ticket reservation queue
const processTicketReservations = async (): Promise<any> => {
  const convex = getConvexClient();
  const bullMQOpts = getBullMQConnectionOpts();
  
  return new Promise<any>((resolve, reject) => {
    let completed = 0;
    let failed = 0;
    
    const worker = new Worker(
      QUEUES.TICKET_RESERVATION,
      async (job) => {
        if (Date.now() - startTime > MAX_EXECUTION_TIME) {
          // Stop processing if we're approaching the execution limit
          return { timed_out: true };
        }
        
        const { eventId, userId, ticketTypeId, quantity } = job.data;
        
        try {
          // Call Convex API to process the ticket reservation
          const result = await convex.mutation(api.events.joinWaitingList, {
            eventId: eventId,
            userId,
            ticketTypeId: ticketTypeId,
            quantity
          });
          
          return { success: true, result };
        } catch (error) {
          console.error('Ticket reservation processing failed:', error);
          throw error;
        }
      },
      bullMQOpts
    );
    
    worker.on('completed', () => {
      completed++;
    });
    
    worker.on('failed', () => {
      failed++;
    });
    
    // Check remaining time every second and close if needed
    const interval = setInterval(() => {
      if (Date.now() - startTime > MAX_EXECUTION_TIME) {
        clearInterval(interval);
        worker.close()
          .then(() => resolve({ completed, failed, timed_out: true }))
          .catch(reject);
      }
    }, 1000);
    
    // Set a maximum time to run this worker
    setTimeout(() => {
      clearInterval(interval);
      worker.close()
        .then(() => resolve({ completed, failed }))
        .catch(reject);
    }, MAX_EXECUTION_TIME);
  });
};

// Process notification queue
const processNotifications = async (): Promise<any> => {
  const bullMQOpts = getBullMQConnectionOpts();
  
  return new Promise<any>((resolve, reject) => {
    let completed = 0;
    let failed = 0;
    
    const worker = new Worker(
      QUEUES.NOTIFICATION,
      async (job) => {
        if (Date.now() - startTime > MAX_EXECUTION_TIME) {
          // Stop processing if we're approaching the execution limit
          return { timed_out: true };
        }
        
        const { userId, type, data } = job.data;
        
        try {
          // In a real implementation, this would send emails, SMS, etc.
          console.log(`Sending ${type} notification to user ${userId}:`, data);
          
          // Simulate notification sending
          await new Promise(resolve => setTimeout(resolve, 100));
          
          return { sent: true, timestamp: Date.now() };
        } catch (error) {
          console.error('Notification failed:', error);
          // We don't rethrow here - we don't want to retry notifications
          return { sent: false, error: error instanceof Error ? error.message : String(error) };
        }
      },
      bullMQOpts
    );
    
    worker.on('completed', () => {
      completed++;
    });
    
    worker.on('failed', () => {
      failed++;
    });
    
    // Set a maximum time to run this worker
    setTimeout(() => {
      worker.close()
        .then(() => resolve({ completed, failed }))
        .catch(reject);
    }, MAX_EXECUTION_TIME);
  });
};

// Main handler for the serverless function
export async function GET(request: NextRequest) {
  try {
    console.log('Request received:', {
      method: request.method,
      url: request.url,
      headers: {
        'x-api-key': request.headers.get('x-api-key') ? '[PRESENT]' : '[MISSING]',
        'authorization': request.headers.get('Authorization') ? '[PRESENT]' : '[MISSING]',
      }
    });
    
    // Check for token in multiple places (query param, headers)
    const queryToken = request.nextUrl.searchParams.get('token');
    const authHeader = request.headers.get('Authorization');
    const apiKeyHeader = request.headers.get('x-api-key');
    
    // Extract Bearer token if present
    const bearerToken = authHeader?.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : null;
    
    console.log('Debug Auth:', { 
      expectedToken: CRON_SECRET.substring(0, 4) + '...[REDACTED]',
      receivedApiKey: apiKeyHeader ? apiKeyHeader.substring(0, 4) + '...[REDACTED]' : null,
      receivedBearer: bearerToken ? bearerToken.substring(0, 4) + '...[REDACTED]' : null,
      receivedQuery: queryToken ? queryToken.substring(0, 4) + '...[REDACTED]' : null,
      tokenLengths: {
        expected: CRON_SECRET.length,
        apiKey: apiKeyHeader?.length,
        bearer: bearerToken?.length,
        query: queryToken?.length
      },
      exactMatch: {
        apiKey: apiKeyHeader === CRON_SECRET,
        bearer: bearerToken === CRON_SECRET,
        query: queryToken === CRON_SECRET
      }
    });
    
    // Check if any of the tokens match
    const isValidToken = [
      queryToken,
      bearerToken,
      apiKeyHeader
    ].some(token => token === CRON_SECRET);
    
    if (!isValidToken) {
      console.log('Token validation failed');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    console.log('Token validation succeeded - attempting Redis connection');

    // Get queue statistics before processing
    const stats = await getQueueStats();
    
    // Process queues concurrently with promises
    const [ticketResults, notificationResults] = await Promise.all([
      processTicketReservations(),
      processNotifications()
    ]);
    
    // Get updated queue statistics after processing
    const updatedStats = await getQueueStats();
    
    // Return results
    return NextResponse.json({
      success: true,
      execution_time: Date.now() - startTime,
      results: {
        ticket_reservations: ticketResults,
        notifications: notificationResults
      },
      stats_before: stats,
      stats_after: updatedStats
    });
  } catch (error) {
    console.error('Error processing queues:', error);
    
    // Specific error handling
    if (error instanceof Error) {
      const errorMessage = error.message;
      
      // Check for Redis connection issues
      if (errorMessage.includes('ECONNREFUSED') || 
          errorMessage.includes('Redis connection') ||
          errorMessage.includes('connect ETIMEDOUT')) {
        console.log('Redis connection error detected');
        return NextResponse.json(
          { error: 'Redis connection failed', message: errorMessage },
          { status: 500 }
        );
      }
      
      // Check for BullMQ errors
      if (errorMessage.includes('Bull') || errorMessage.includes('Queue')) {
        console.log('BullMQ error detected');
        return NextResponse.json(
          { error: 'Queue processing error', message: errorMessage },
          { status: 500 }
        );
      }
    }
    
    // Generic error response
    return NextResponse.json(
      { error: 'Failed to process queues', message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// POST handler - reusing the same logic as GET
export async function POST(request: NextRequest) {
  // Simply call the GET handler with the same request
  return GET(request);
}

// Get statistics for all queues
async function getQueueStats() {
  const bullMQOpts = getBullMQConnectionOpts();
  const stats: Record<string, any> = {};
  
  for (const queueName of Object.values(QUEUES)) {
    try {
      const queue = new Queue(queueName, bullMQOpts);
      stats[queueName] = {
        waiting: await queue.getWaitingCount(),
        active: await queue.getActiveCount(),
        completed: await queue.getCompletedCount(),
        failed: await queue.getFailedCount(),
      };
    } catch (error) {
      console.error(`Error getting stats for queue ${queueName}:`, error);
      stats[queueName] = { error: 'Failed to get stats' };
    }
  }
  
  return stats;
}
