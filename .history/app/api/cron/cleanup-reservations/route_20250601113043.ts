"use server";

import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';

// Verify the API token for security - checks multiple places
const validateToken = (request: NextRequest) => {
  // Hardcoded for testing - REMOVE BEFORE PRODUCTION
  const secretToken = "Zy106X9rjFYKY6DxE9WVWrNF5nNbiZE1nW3x119Llb0=";
  
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
    // Direct token check
    const expectedToken = "Zy106X9rjFYKY6DxE9WVWrNF5nNbiZE1nW3x119Llb0";
    const apiKeyHeader = request.headers.get('x-api-key');
    
    console.log('Auth debug:', {
      expectedTokenLength: expectedToken.length,
      receivedTokenLength: apiKeyHeader?.length,
      headerPresent: apiKeyHeader ? 'yes' : 'no',
      headerFirstChars: apiKeyHeader ? apiKeyHeader.substring(0, 4) : 'none',
      expectedFirstChars: expectedToken.substring(0, 4)
    });
    
    // Simple direct token comparison
    if (apiKeyHeader !== expectedToken) {
      console.log('Token validation failed - direct comparison');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    console.log('Token validation succeeded - direct comparison');
    
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
