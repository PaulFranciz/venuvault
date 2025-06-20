import { NextRequest, NextResponse } from 'next/server';
import { refundPaystackTransaction } from '@/app/actions/refundPaystackTransaction';
import { Id } from '@/convex/_generated/dataModel';

export async function POST(request: NextRequest) {
  try {
    const { eventId } = await request.json();
    
    if (!eventId) {
      return NextResponse.json({ error: 'Event ID is required' }, { status: 400 });
    }

    const result = await refundPaystackTransaction(eventId as Id<"events">);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Refund API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
} 