import { NextRequest, NextResponse } from "next/server";
import { Queue } from "bullmq";
import IORedis from 'ioredis';

// Get a Redis connection
const getRedisConnection = () => {
  const redisUrl = process.env.REDIS_URL || "rediss://default:AS1gAAIjcDFiN2M5YjQ4MDY0MWM0NTRiOTE3M2U0NDJkNjYxODZiMXAxMA@tops-mudfish-11616.upstash.io:6379";
  
  return new IORedis(redisUrl, {
    tls: { rejectUnauthorized: false }, // Required for TLS connection
    retryStrategy: (times) => Math.min(times * 50, 2000), // Exponential backoff
    maxRetriesPerRequest: 3,
  });
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: reservationId } = await params;
    
    if (!reservationId) {
      return NextResponse.json(
        { error: "Reservation ID is required" },
        { status: 400 }
      );
    }

    // Connect to the ticket reservation queue
    const ticketQueue = new Queue("ticketReservation", {
      connection: getRedisConnection(),
    });

    // Get the job details
    const job = await ticketQueue.getJob(reservationId);
    
    if (!job) {
      return NextResponse.json(
        { error: "Reservation not found" },
        { status: 404 }
      );
    }

    // Extract relevant data from the job
    const jobData = job.data;
    const jobState = await job.getState();
    
    return NextResponse.json({
      id: reservationId,
      state: jobState,
      eventId: jobData.eventId,
      ticketTypeId: jobData.ticketTypeId,
      quantity: jobData.quantity,
      userId: jobData.userId,
      createdAt: job.timestamp,
      // Add expiration time (8 minutes from creation)
      expiresAt: job.timestamp + (8 * 60 * 1000),
      isExpired: Date.now() > (job.timestamp + (8 * 60 * 1000)),
    });

  } catch (error) {
    console.error("Error fetching reservation:", error);
    return NextResponse.json(
      { error: "Failed to fetch reservation details" },
      { status: 500 }
    );
  }
} 