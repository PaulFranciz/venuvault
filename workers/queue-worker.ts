#!/usr/bin/env node
/**
 * Worker script for processing background jobs
 * In production, this would run on separate servers or serverless functions
 */

import { startWorkers, createQueueMonitors } from '../lib/queue';

// Set environment flag to enable workers in development
process.env.ENABLE_QUEUE_WORKERS = '1';
process.env.ENABLE_QUEUE_SCHEDULERS = '1';

console.log('Starting queue workers and schedulers...');

// Start queue monitors for job events
const queueMonitors = createQueueMonitors();

// Start workers for processing jobs
startWorkers();

console.log('Queue system initialized and running');

// Graceful shutdown
const shutdown = () => {
  console.log('Shutting down workers...');
  
  // Close queue monitors
  if (queueMonitors) {
    Promise.all(queueMonitors.map((monitor) => monitor.close()))
      .then(() => console.log('Queue monitors closed'))
      .catch((err: Error) => console.error('Error closing queue monitors:', err));
  }
  
  // Exit process
  setTimeout(() => {
    console.log('Exiting...');
    process.exit(0);
  }, 1000);
};

// Handle termination signals
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
