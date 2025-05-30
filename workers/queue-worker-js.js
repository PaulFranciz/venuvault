#!/usr/bin/env node
/**
 * Simplified worker script for processing background jobs
 * This JavaScript version doesn't require TypeScript compilation
 */

// Redis and BullMQ imports
const { Queue, Worker, QueueEvents } = require('bullmq');
const IORedis = require('ioredis');
const { ConvexHttpClient } = require('convex/browser');
require('dotenv').config({ path: '.env.local' });

// Redis connection configuration
const redisUrl = process.env.REDIS_URL || "rediss://default:AS1gAAIjcDFiN2M5YjQ4MDY0MWM0NTRiOTE3M2U0NDJkNjYxODZiMXAxMA@tops-mudfish-11616.upstash.io:6379";

// Standard Redis client for normal operations
const redisConnection = new IORedis(redisUrl, {
  tls: { rejectUnauthorized: false },
  retryStrategy: (times) => Math.min(times * 50, 2000),
});

// BullMQ connection options - must have maxRetriesPerRequest: null
const bullMQConnectionOpts = {
  connection: {
    host: "tops-mudfish-11616.upstash.io",
    port: 6379,
    username: "default",
    password: "AS1gAAIjcDFiN2M5YjQ4MDY0MWM0NTRiOTE3M2U0NDJkNjYxODZiMXAxMA",
    tls: { rejectUnauthorized: false },
    maxRetriesPerRequest: null, // Required by BullMQ
  }
};

// Convex client for API calls
const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
if (!convexUrl) {
  throw new Error('NEXT_PUBLIC_CONVEX_URL is not defined');
}
const convex = new ConvexHttpClient(convexUrl);

// Queue names
const QUEUES = {
  TICKET_RESERVATION: 'ticketReservation',
  PAYMENT_PROCESSING: 'paymentProcessing',
  NOTIFICATION: 'notification',
  WAITLIST_PROCESSING: 'waitlistProcessing',
};

// Start workers for processing jobs
function startWorkers() {
  console.log('Starting queue workers...');

  // Ticket Reservation Worker
  const ticketReservationWorker = new Worker(
    QUEUES.TICKET_RESERVATION, 
    async (job) => {
      const { eventId, userId, ticketTypeId, quantity } = job.data;
      
      console.log(`Processing ticket reservation: 
        - Event: ${eventId}
        - User: ${userId}
        - Ticket Type: ${ticketTypeId}
        - Quantity: ${quantity}
      `);
      
      try {
        // For demo purposes, we're just simulating the API call
        // In production, this would call your Convex mutation
        console.log('Reserving ticket in database...');
        
        // Simulate database operation
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Send notification
        console.log('Sending reservation notification...');
        
        return { success: true, timestamp: Date.now() };
      } catch (error) {
        console.error('Ticket reservation failed:', error);
        throw error;
      }
    },
    bullMQConnectionOpts
  );

  // Notification Worker
  const notificationWorker = new Worker(
    QUEUES.NOTIFICATION,
    async (job) => {
      const { userId, type, data } = job.data;
      
      console.log(`Sending ${type} notification to user ${userId}:`, data);
      
      // Simulate notification sending
      await new Promise(resolve => setTimeout(resolve, 500));
      
      return { sent: true, timestamp: Date.now() };
    },
    bullMQConnectionOpts
  );

  // Setup event listeners for worker events
  ticketReservationWorker.on('completed', job => {
    console.log(`Job ${job.id} completed successfully`);
  });

  ticketReservationWorker.on('failed', (job, err) => {
    console.error(`Job ${job?.id} failed:`, err);
  });

  notificationWorker.on('completed', job => {
    console.log(`Notification job ${job.id} completed`);
  });

  console.log('All workers started successfully');
  
  // Return workers for cleanup
  return [ticketReservationWorker, notificationWorker];
}

// Start queue monitors
function createQueueMonitors() {
  return Object.values(QUEUES).map(queueName => {
    const monitor = new QueueEvents(queueName, bullMQConnectionOpts);
    
    monitor.on('completed', ({ jobId }) => {
      console.log(`[MONITOR] Job ${jobId} in ${queueName} completed`);
    });
    
    monitor.on('failed', ({ jobId, failedReason }) => {
      console.error(`[MONITOR] Job ${jobId} in ${queueName} failed: ${failedReason}`);
    });
    
    return monitor;
  });
}

// Main execution
console.log('Initializing queue system...');

// Start queue monitors for job events
const queueMonitors = createQueueMonitors();
console.log('Queue monitors initialized');

// Start workers for processing jobs
const workers = startWorkers();
console.log('Queue system running');

// Add a test job to verify everything is working
async function addTestJob() {
  try {
    const queue = new Queue(QUEUES.TICKET_RESERVATION, bullMQConnectionOpts);
    const job = await queue.add('test-reservation', {
      eventId: 'test-event-123',
      userId: 'test-user-456',
      ticketTypeId: 'test-ticket-789',
      quantity: 2,
      timestamp: Date.now()
    });
    
    console.log(`Added test job with ID: ${job.id}`);
  } catch (error) {
    console.error('Failed to add test job:', error);
  }
}

// Add a test job after 2 seconds
setTimeout(addTestJob, 2000);

// Graceful shutdown
const shutdown = () => {
  console.log('Shutting down queue system...');
  
  // Close all workers
  Promise.all(workers.map(worker => worker.close()))
    .then(() => console.log('Workers closed'))
    .catch(err => console.error('Error closing workers:', err));
  
  // Close all monitors
  Promise.all(queueMonitors.map(monitor => monitor.close()))
    .then(() => console.log('Monitors closed'))
    .catch(err => console.error('Error closing monitors:', err));
  
  // Close Redis connection
  redisConnection.quit()
    .then(() => console.log('Redis connection closed'))
    .catch(err => console.error('Error closing Redis connection:', err));
  
  // Exit process
  setTimeout(() => {
    console.log('Exiting...');
    process.exit(0);
  }, 1000);
};

// Handle termination signals
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
