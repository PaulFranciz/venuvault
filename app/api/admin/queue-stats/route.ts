import { NextRequest, NextResponse } from 'next/server';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { createRedisClient } from '@/lib/redis';

// This would typically be protected by admin authentication
// For this example, we're using a simple secret token
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'admin-secret-key';

// Queue names
const QUEUES = {
  TICKET_RESERVATION: 'ticketReservation',
  PAYMENT_PROCESSING: 'paymentProcessing',
  NOTIFICATION: 'notification',
  WAITLIST_PROCESSING: 'waitlistProcessing',
};

// BullMQ connection options
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

// Main handler for the API endpoint
export async function GET(request: NextRequest) {
  try {
    // Verify admin authorization token
    const token = request.nextUrl.searchParams.get('token');
    if (token !== ADMIN_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get Redis and queue stats
    const [queueStats, redisStats, jobHistory, processingRates] = await Promise.all([
      getQueueStats(),
      getRedisStats(),
      getJobHistory(),
      getProcessingRates()
    ]);
    
    // Return all stats in a single response
    return NextResponse.json({
      timestamp: Date.now(),
      queue_stats: queueStats,
      redis_stats: redisStats,
      job_history: jobHistory,
      processing_rates: processingRates
    });
  } catch (error) {
    console.error('Error fetching queue stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch queue stats', message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// Get detailed statistics for all queues
async function getQueueStats() {
  const bullMQOpts = getBullMQConnectionOpts();
  const stats: Record<string, any> = {};
  
  for (const queueName of Object.values(QUEUES)) {
    try {
      const queue = new Queue(queueName, bullMQOpts);
      
      // Get counts for different job states
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        queue.getWaitingCount(),
        queue.getActiveCount(),
        queue.getCompletedCount(),
        queue.getFailedCount(),
        queue.getDelayedCount()
      ]);
      
      // Get a sample of jobs in each state for further inspection
      const [waitingJobs, failedJobs] = await Promise.all([
        queue.getWaiting(0, 5),  // Get first 5 waiting jobs
        queue.getFailed(0, 5)    // Get first 5 failed jobs
      ]);
      
      // Format job samples for display
      const formatJobs = (jobs: any[]) => jobs.map(job => ({
        id: job.id,
        name: job.name,
        timestamp: job.timestamp,
        processedOn: job.processedOn,
        finishedOn: job.finishedOn,
        data: job.data,
        attemptsMade: job.attemptsMade,
        failedReason: job.failedReason
      }));
      
      stats[queueName] = {
        counts: {
          waiting,
          active,
          completed,
          failed,
          delayed,
          total: waiting + active + completed + failed + delayed
        },
        samples: {
          waiting: formatJobs(waitingJobs),
          failed: formatJobs(failedJobs)
        }
      };
    } catch (error) {
      console.error(`Error getting stats for queue ${queueName}:`, error);
      stats[queueName] = { error: 'Failed to get stats' };
    }
  }
  
  return stats;
}

// Get Redis server stats
async function getRedisStats() {
  try {
    const redis = createRedisClient();
    
    // This is a simplified version - in production, you would
    // implement a proper Redis INFO parser for detailed metrics
    const infoStr = await (redis as any).client?.call('INFO');
    
    // Parse INFO command output
    const info: Record<string, any> = {};
    if (infoStr) {
      const sections = infoStr.split('#');
      
      for (const section of sections) {
        const lines = section.split('\r\n').filter(Boolean);
        if (lines.length > 0) {
          const sectionName = lines[0].toLowerCase().trim();
          info[sectionName] = {};
          
          for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            const [key, value] = line.split(':');
            if (key && value) {
              info[sectionName][key.trim()] = value.trim();
            }
          }
        }
      }
    }
    
    // Return key metrics that matter for performance
    return {
      memory: info['memory'] || {},
      clients: info['clients'] || {},
      stats: info['stats'] || {},
      keyspace: info['keyspace'] || {},
      server: info['server'] || {}
    };
  } catch (error) {
    console.error('Failed to get Redis stats:', error);
    return { error: 'Failed to get Redis stats' };
  }
}

// Get job history (completed/failed over time)
async function getJobHistory() {
  // This would ideally come from a time-series database or logs
  // For this example, we'll simulate with random data
  
  // Get dates for the last 7 days
  const dates = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - i);
    return date.toISOString().split('T')[0];
  }).reverse();
  
  // Generate sample data for each queue
  const history: Record<string, any> = {
    dates,
    queues: {}
  };
  
  for (const queueName of Object.values(QUEUES)) {
    history.queues[queueName] = {
      completed: dates.map(() => Math.floor(Math.random() * 100)),
      failed: dates.map(() => Math.floor(Math.random() * 10)),
      processing_time: dates.map(() => Math.floor(Math.random() * 500 + 100)) // ms
    };
  }
  
  return history;
}

// Get processing rates (jobs/minute)
async function getProcessingRates() {
  // In a production system, you would calculate this from actual metrics
  // For this example, we'll simulate with random data
  
  const rates: Record<string, any> = {};
  
  for (const queueName of Object.values(QUEUES)) {
    // Generate realistic rates based on queue type
    let baseRate = 0;
    switch (queueName) {
      case QUEUES.TICKET_RESERVATION:
        baseRate = 15; // 15 tickets/minute
        break;
      case QUEUES.NOTIFICATION:
        baseRate = 60; // 60 notifications/minute
        break;
      case QUEUES.PAYMENT_PROCESSING:
        baseRate = 10; // 10 payments/minute
        break;
      case QUEUES.WAITLIST_PROCESSING:
        baseRate = 5;  // 5 waitlist operations/minute
        break;
    }
    
    // Add some randomness
    const currentRate = baseRate + (Math.random() * baseRate * 0.2) - (baseRate * 0.1);
    
    rates[queueName] = {
      current_rate: Math.round(currentRate * 10) / 10, // Round to 1 decimal place
      peak_rate: Math.round(baseRate * 1.5 * 10) / 10,
      capacity: baseRate * 10 // 10x headroom
    };
  }
  
  return rates;
}
