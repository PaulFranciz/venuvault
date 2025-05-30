import { NextRequest, NextResponse } from 'next/server';
import { getQStashClient } from '@/lib/qstash';
import { getAuth } from '@clerk/nextjs/server';

export async function GET(request: NextRequest) {
  try {
    // Authenticate user (optional, you can make this public if needed)
    const { userId } = getAuth(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get message ID from query params
    const messageId = request.nextUrl.searchParams.get('id');
    if (!messageId) {
      return NextResponse.json({ error: 'Missing message ID' }, { status: 400 });
    }

    // Get QStash client
    const client = getQStashClient();
    
    // Fetch message status
    const status = await client.messages.get(messageId);
    
    return NextResponse.json(status);
  } catch (error) {
    console.error('Error fetching QStash message status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch message status', message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
