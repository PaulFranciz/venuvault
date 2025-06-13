"use server";

import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';

// Verify the API token for security - checks multiple places
const validateToken = (request: NextRequest) => {
  // Use environment variable for the secret token
  const secretToken = process.env.API_SECRET_TOKEN;
  
  if (!secretToken) {
    console.error('API_SECRET_TOKEN environment variable is not set');
    return false;
  }
  
  // Check for token in multiple places (query param, headers)
  const queryToken = request.nextUrl.searchParams.get('token');
  const authHeader = request.headers.get('Authorization');
  const apiKeyHeader = request.headers.get('x-api-key');
  
  // Extract Bearer token if present
  const bearerToken = authHeader?.startsWith('Bearer ') 
    ? authHeader.substring(7) 
    : null;
  
  // Check if any of the tokens match
  return [
    queryToken,
    bearerToken,
    apiKeyHeader
  ].some(token => token && token === secretToken);
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
 * API route that handles cleaning up expired ticket reservations
 * This is called by the GitHub Actions workflow
 */
export async function POST(request: NextRequest) {
  // Begin with direct debugging output
  console.log('Cleanup-reservations API endpoint hit with', request.method);
  
  try {
    // Validate token using standardized method
    if (!validateToken(request)) {
      console.log('Token validation failed');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    console.log('Token validation succeeded');
    
    const convex = getConvexClient();
    
    // Call the Convex mutation to clean up expired reservations
    const result = await convex.mutation(api.tickets.cleanupExpiredReservations, {});
    
    console.log('Cleanup completed successfully:', result);
    return NextResponse.json({ 
      success: true,
      message: 'Expired reservations cleanup completed',
      result
    });
  } catch (error) {
    console.error('Error during cleanup:', error);
    return NextResponse.json({ 
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
