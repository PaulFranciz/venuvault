import { NextRequest, NextResponse } from 'next/server';
import { sendTicketConfirmationEmail, TicketData } from '@/lib/emailService';

export async function POST(request: NextRequest) {
  try {
    // Verify API key for security
    const apiKey = request.headers.get('x-api-key');
    if (!apiKey || apiKey !== process.env.API_SECRET_TOKEN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ticketData: TicketData = await request.json();

    // Validate required fields
    const requiredFields = [
      'id', 'customerName', 'customerEmail', 'eventName', 
      'eventDate', 'eventLocation', 'ticketType', 'quantity',
      'totalAmount', 'currency', 'orderNumber', 'eventId'
    ];

    for (const field of requiredFields) {
      if (!ticketData[field as keyof TicketData]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Send the email
    const result = await sendTicketConfirmationEmail(ticketData);

    if (result.success) {
      return NextResponse.json({
        success: true,
        emailId: result.id,
        message: 'Ticket confirmation email sent successfully',
      });
    } else {
      return NextResponse.json(
        { 
          success: false, 
          error: result.error,
          message: 'Failed to send ticket confirmation email' 
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error sending ticket confirmation email:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

// GET endpoint for testing
export async function GET() {
  return NextResponse.json({
    message: 'Ticket confirmation email endpoint is working',
    endpoint: '/api/emails/send-confirmation',
    method: 'POST',
    requiredHeaders: ['x-api-key'],
    requiredFields: [
      'id', 'customerName', 'customerEmail', 'eventName', 
      'eventDate', 'eventLocation', 'ticketType', 'quantity',
      'totalAmount', 'currency', 'orderNumber', 'eventId'
    ],
  });
} 