#!/usr/bin/env node
/**
 * Worker script for processing background jobs
 * In production, this would run on separate servers or serverless functions
 */

import { startWorkers, createQueueMonitors } from '../lib/queueServer';

// Set environment flag to enable workers in development
process.env.ENABLE_QUEUE_WORKERS = '1';
process.env.ENABLE_QUEUE_SCHEDULERS = '1';

console.log('Starting queue workers and schedulers...');

// Initialize the queue system asynchronously
async function initQueueSystem() {
  try {
    // Start queue monitors for job events
    const queueMonitors = await createQueueMonitors();

    // Start workers for processing jobs
    await startWorkers();

    console.log('Queue system initialized and running');

    // Set up graceful shutdown
    const handleShutdown = async () => {
      console.log('Shutting down workers...');
      
      // Close queue monitors
      if (queueMonitors && Array.isArray(queueMonitors)) {
        try {
          await Promise.all(queueMonitors.map((monitor) => monitor.close()));
          console.log('Queue monitors closed');
        } catch (err) {
          console.error('Error closing queue monitors:', err);
        }
      }
      
      // Exit process
      setTimeout(() => {
        console.log('Exiting...');
        process.exit(0);
      }, 1000);
    };

    // Set up process signal handlers
    process.on('SIGINT', handleShutdown);
    process.on('SIGTERM', handleShutdown);
  } catch (error) {
    console.error('Failed to initialize queue system:', error);
  }
}

// Start the queue system
initQueueSystem();
