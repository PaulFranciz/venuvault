#!/usr/bin/env node
/**
 * Worker script for processing background jobs
 * In production, this would run on separate servers or serverless functions
 */

import { createQueueMonitors, startWorkers } from '../lib/queue.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables from .env.local
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env.local') });

// Set environment flag to enable workers in development
process.env.ENABLE_QUEUE_WORKERS = '1';
process.env.ENABLE_QUEUE_MONITORS = '1';

console.log('Starting queue workers and monitors...');

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
      .catch((err) => console.error('Error closing queue monitors:', err));
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
