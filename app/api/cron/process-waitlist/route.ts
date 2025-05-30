"use server";

import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';

// Verify the API token for security
const validateToken = (request: NextRequest) => {
  const token = request.nextUrl.searchParams.get('token');
  // Use environment variable for the secret token
  const secretToken = process.env.API_SECRET_TOKEN || 'your-secret-token';
  
  if (!token || token !== secretToken) {
    return false;
  }
  return true;
};

// Get Convex client for database operations
const getConvexClient = () => {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    throw new Error('NEXT_PUBLIC_CONVEX_URL is not defined');
  }
  return new ConvexHttpClient(convexUrl);
};

/**
 * API route that processes waitlist entries for events with available tickets
 * This is called by the GitHub Actions workflow (hourly)
 */
export async function POST(request: NextRequest) {
  console.log('Starting waitlist processing for events with availability...');
  
  // Validate the request token
  if (!validateToken(request)) {
    console.error('Invalid or missing token');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const convex = getConvexClient();
    
    // Call the Convex mutation to process waitlist entries
    const result = await convex.mutation(api.tickets.processWaitlist, {
      // You can add parameters here like max entries to process
      maxEntries: 100
    });
    
    console.log('Waitlist processing completed successfully:', result);
    return NextResponse.json({ 
      success: true,
      message: 'Waitlist processing completed',
      result
    });
  } catch (error) {
    console.error('Error during waitlist processing:', error);
    return NextResponse.json({ 
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
