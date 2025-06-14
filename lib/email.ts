import { Resend } from 'resend';
import { render } from '@react-email/render';

// Initialize Resend with API key
const resend = new Resend(process.env.RESEND_API_KEY);

// Email configuration
export const EMAIL_CONFIG = {
  from: process.env.EMAIL_FROM || 'Ticwaka <noreply@ticwaka.com>',
  replyTo: process.env.EMAIL_REPLY_TO || 'support@ticwaka.com',
  domain: process.env.NEXT_PUBLIC_APP_URL || 'https://ticwaka.vercel.app',
} as const;

// Email types for better type safety
export type EmailType = 
  | 'ticket-confirmation'
  | 'event-reminder-24h'
  | 'event-reminder-1h'
  | 'cancellation-notification'
  | 'waitlist-available'
  | 'password-reset'
  | 'welcome'
  | 'refund-confirmation';

// Email sending interface
export interface EmailData {
  to: string | string[];
  subject: string;
  template: React.ReactElement;
  type: EmailType;
  metadata?: Record<string, any>;
}

// Main email sending function
export async function sendEmail(data: EmailData) {
  try {
    // Validate required environment variables
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY environment variable is not set');
    }

    // Render React component to HTML
    const html = await render(data.template);

    // Send email via Resend
    const result = await resend.emails.send({
      from: EMAIL_CONFIG.from,
      to: Array.isArray(data.to) ? data.to : [data.to],
      subject: data.subject,
      html,
      replyTo: EMAIL_CONFIG.replyTo,
      tags: [
        { name: 'type', value: data.type },
        { name: 'environment', value: process.env.NODE_ENV || 'development' },
      ],
      headers: {
        'X-Email-Type': data.type,
        'X-App-Version': '1.0.0',
      },
    });

    // Log success
    console.log(`✅ Email sent successfully:`, {
      id: result.data?.id,
      type: data.type,
      to: data.to,
      subject: data.subject,
    });

    return {
      success: true,
      id: result.data?.id,
      error: null,
    };

  } catch (error) {
    // Log error
    console.error(`❌ Failed to send email:`, {
      type: data.type,
      to: data.to,
      subject: data.subject,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return {
      success: false,
      id: null,
      error: error instanceof Error ? error.message : 'Failed to send email',
    };
  }
}

// Batch email sending for multiple recipients
export async function sendBatchEmails(emails: EmailData[]) {
  const results = await Promise.allSettled(
    emails.map(email => sendEmail(email))
  );

  const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
  const failed = results.length - successful;

  console.log(`📊 Batch email results: ${successful} sent, ${failed} failed`);

  return {
    total: results.length,
    successful,
    failed,
    results: results.map(r => r.status === 'fulfilled' ? r.value : { success: false, error: 'Promise rejected' }),
  };
}

// Email validation helper
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Email queue for high-volume sending (future enhancement)
export interface EmailQueueItem extends EmailData {
  id: string;
  createdAt: Date;
  attempts: number;
  maxAttempts: number;
  scheduledFor?: Date;
}

// Helper to create email queue items
export function createEmailQueueItem(
  data: EmailData, 
  scheduledFor?: Date,
  maxAttempts: number = 3
): EmailQueueItem {
  return {
    ...data,
    id: `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    createdAt: new Date(),
    attempts: 0,
    maxAttempts,
    scheduledFor,
  };
}

// Email template wrapper for consistent styling
export function createEmailWrapper(children: React.ReactElement, title: string) {
  return {
    title,
    preview: title,
    children,
  };
} 