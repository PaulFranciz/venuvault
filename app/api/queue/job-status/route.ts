import { NextRequest, NextResponse } from 'next/server';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { QUEUES } from '@/lib/queueTypes';
import { getAuth } from '@clerk/nextjs/server';

// Get a Redis connection
const getRedisConnection = () => {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  return new IORedis(redisUrl);
};

export async function GET(request: NextRequest) {
  try {
    // Verify user authentication
    const { userId } = getAuth(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const jobId = searchParams.get('jobId');
    const queueName = searchParams.get('queue');
    
    // Validate input
    if (!jobId || !queueName) {
      return NextResponse.json(
        { error: 'Missing jobId or queue parameter' }, 
        { status: 400 }
      );
    }
    
    // Verify queue name is valid
    if (!Object.values(QUEUES).includes(queueName)) {
      return NextResponse.json(
        { error: 'Invalid queue name' }, 
        { status: 400 }
      );
    }

    // Get job status from queue
    const queue = new Queue(queueName, { connection: getRedisConnection() });
    const job = await queue.getJob(jobId);
    
    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' }, 
        { status: 404 }
      );
    }
    
    // Get job state, progress, and data
    const state = await job.getState();
    const progress = job.progress;
    const result = job.returnvalue;
    const failReason = job.failedReason;
    
    // Return job status to client
    return NextResponse.json({
      id: job.id,
      state,
      progress,
      result,
      error: failReason,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Job status error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve job status' },
      { status: 500 }
    );
  }
}
