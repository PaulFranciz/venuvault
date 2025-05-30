"use server";

import { Queue, Worker, Job, QueueEvents } from 'bullmq';
import IORedis from 'ioredis';
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { ConvexHttpClient } from 'convex/browser';
import { QUEUES, TicketReservationJob, PaymentProcessingJob, NotificationJob, WaitlistProcessingJob } from './queueTypes';

// Redis connection for BullMQ
const getRedisConnection = () => {
  // Use Redis URL from environment variables or fall back to default
  const redisUrl = process.env.REDIS_URL || "rediss://default:AS1gAAIjcDFiN2M5YjQ4MDY0MWM0NTRiOTE3M2U0NDJkNjYxODZiMXAxMA@tops-mudfish-11616.upstash.io:6379";
  
  return new IORedis(redisUrl, {
    tls: { rejectUnauthorized: false }, // Required for TLS connection
    retryStrategy: (times) => Math.min(times * 50, 2000), // Exponential backoff
    maxRetriesPerRequest: 3,
  });
};

// Create Convex HTTP client for background processing
const getConvexClient = () => {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    throw new Error('NEXT_PUBLIC_CONVEX_URL is not defined');
  }
  return new ConvexHttpClient(convexUrl);
};

// Queue creation function (server-side only)
export async function createQueue<T>(name: string) {
  return new Queue<T>(name, {
    connection: getRedisConnection(),
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
      removeOnComplete: true,
      removeOnFail: 5000, // Keep failed jobs for debugging
    },
  });
}

// Create queue event listeners for monitoring
export async function createQueueMonitors() {
  // Only create monitors in production or when explicitly enabled
  if (process.env.NODE_ENV !== 'production' && !process.env.ENABLE_QUEUE_MONITORS) {
    console.log('Queue monitors disabled in development. Set ENABLE_QUEUE_MONITORS=1 to enable.');
    return;
  }

  // Create event listeners for each queue
  return Object.values(QUEUES).map(queueName => 
    new QueueEvents(queueName, { connection: getRedisConnection() })
  );
}

// Worker factory function
export async function createWorker<T>(
  queueName: string, 
  processor: (job: Job<T>) => Promise<any>
) {
  return new Worker<T>(queueName, processor, { 
    connection: getRedisConnection(),
    concurrency: 10, // Process 10 jobs concurrently
  });
}

// Helper to add job to queue
// Using any for the job name type to work around BullMQ typing constraints
export async function addJob<T>(queueName: string, data: T, options: any = {}) {
  const queue = await createQueue<T>(queueName);
  // Cast both job name and data to any to bypass TypeScript's strict typing requirements
  // This is necessary because BullMQ has complex generic constraints
  return queue.add('job' as any, data as any, options);
}

// Queue specific job adders
export async function addTicketReservation(data: TicketReservationJob) {
  return addJob(QUEUES.TICKET_RESERVATION, data, {
    // Ticket reservations expire after 10 minutes
    removeOnComplete: true,
    timeout: 1000 * 60 * 10,
  });
}

export async function addPaymentProcessing(data: PaymentProcessingJob) {
  return addJob(QUEUES.PAYMENT_PROCESSING, data);
}

export async function addNotification(data: NotificationJob) {
  return addJob(QUEUES.NOTIFICATION, data);
}

export async function addWaitlistProcessing(data: WaitlistProcessingJob, options: any = {}) {
  return addJob(QUEUES.WAITLIST_PROCESSING, data, options);
}

// Start workers (call this in a separate worker process, not in the main Next.js app)
export async function startWorkers() {
  // Only start workers in production or when explicitly enabled
  if (process.env.NODE_ENV !== 'production' && !process.env.ENABLE_QUEUE_WORKERS) {
    console.log('Queue workers disabled in development. Set ENABLE_QUEUE_WORKERS=1 to enable.');
    return;
  }

  const convex = getConvexClient();

  // Ticket Reservation Worker
  createWorker<TicketReservationJob>(QUEUES.TICKET_RESERVATION, async (job) => {
    const { eventId, userId, ticketTypeId, quantity } = job.data;
    
    try {
      // Call Convex mutation to reserve ticket
      // Use type casting to handle the Id conversion issue
      await convex.mutation(api.tickets.reserveTicket, {
        eventId: eventId as unknown as Id<"events">,
        userId: userId,
        ticketTypeId: ticketTypeId,
        quantity
      });
      
      // Notify user of successful reservation
      await addNotification({
        userId,
        type: 'ticket_reserved',
        data: { eventId, ticketTypeId, quantity }
      });
      
      return { success: true };
    } catch (error) {
      console.error(`Ticket reservation failed for event ${eventId}, user ${userId}:`, error);
      throw error; // This will trigger job retry
    }
  });
  
  // Payment Processing Worker
  createWorker<PaymentProcessingJob>(QUEUES.PAYMENT_PROCESSING, async (job) => {
    const { reservationId, userId, amount, paymentMethod } = job.data;
    
    try {
      // Process payment
      // In a real app, you would integrate with a payment gateway here
      
      // Call Convex mutation to confirm payment
      // Use type casting to handle the Id conversion issue
      await convex.mutation(api.tickets.confirmPayment, {
        reservationId: reservationId as unknown as Id<"waitingList">,
        paymentMethod
      });
      
      // Notify user of successful payment
      await addNotification({
        userId,
        type: 'payment_processed',
        data: { reservationId, amount }
      });
      
      return { success: true };
    } catch (error) {
      console.error(`Payment processing failed for reservation ${reservationId}:`, error);
      throw error; // This will trigger job retry
    }
  });
  
  console.log('Queue workers started successfully');
}
