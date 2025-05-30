#!/usr/bin/env node
/**
 * Script to build TypeScript files for the worker
 * Run with: node scripts/build-worker.mjs
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

async function buildWorker() {
  console.log('Building TypeScript files for worker...');
  
  try {
    // Create dist directory if it doesn't exist
    await fs.mkdir(path.join(rootDir, 'dist'), { recursive: true });
    
    // Compile TypeScript files
    console.log('Compiling TypeScript files...');
    await execAsync('npx tsc -p tsconfig.json', { cwd: rootDir });
    
    // Copy worker file with proper imports
    const workerContent = `#!/usr/bin/env node
/**
 * Worker script for processing background jobs
 */

import { createQueueMonitors, startWorkers } from '../dist/lib/queue.js';
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
process.on('SIGINT', shutdown);`;
    
    await fs.writeFile(path.join(rootDir, 'workers', 'queue-worker.mjs'), workerContent);
    
    console.log('✅ Build completed successfully');
    console.log('Now you can run: node workers/queue-worker.mjs');
  } catch (error) {
    console.error('❌ Build failed:', error);
  }
}

buildWorker();
