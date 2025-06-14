import { sendEmail, EmailData } from './email';
import TicketConfirmationEmail from '../emails/TicketConfirmationEmail';
import EventReminderEmail from '../emails/EventReminderEmail';
import { format } from 'date-fns';

// Types for email data
export interface TicketData {
  id: string;
  customerName: string;
  customerEmail: string;
  eventName: string;
  eventDate: number;
  eventTime?: string;
  eventLocation: string;
  eventImage?: string;
  ticketType: string;
  quantity: number;
  totalAmount: number;
  currency: string;
  orderNumber: string;
  qrCodeUrl: string;
  eventId: string;
}

export interface ReminderData {
  customerName: string;
  customerEmail: string;
  eventName: string;
  eventDate: number;
  eventTime?: string;
  eventLocation: string;
  eventImage?: string;
  ticketType: string;
  quantity: number;
  ticketId: string;
  qrCodeUrl: string;
  eventId: string;
  reminderType: '24h' | '1h';
}

// Generate QR code URL (placeholder - you can integrate with a QR service)
export function generateQRCodeUrl(ticketId: string, eventId: string): string {
  // This would typically integrate with a QR code service
  // For now, we'll use a placeholder that generates QR codes
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ticwaka.vercel.app';
  const qrData = `${baseUrl}/validate-ticket/${ticketId}`;
  
  // Using QR Server API (free service) - you might want to use your own
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData)}`;
}

// Format date for emails
export function formatEmailDate(timestamp: number): string {
  return format(new Date(timestamp), 'EEEE, MMMM do, yyyy');
}

// Format time for emails
export function formatEmailTime(timestamp: number, eventTime?: string): string {
  if (eventTime) {
    return eventTime;
  }
  return format(new Date(timestamp), 'h:mm a');
}

// Send ticket confirmation email
export async function sendTicketConfirmationEmail(ticketData: TicketData) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ticwaka.vercel.app';
  
  const emailData: EmailData = {
    to: ticketData.customerEmail,
    subject: `🎉 Your ticket for ${ticketData.eventName} is confirmed!`,
    type: 'ticket-confirmation',
    template: TicketConfirmationEmail({
      customerName: ticketData.customerName,
      eventName: ticketData.eventName,
      eventDate: formatEmailDate(ticketData.eventDate),
      eventTime: formatEmailTime(ticketData.eventDate, ticketData.eventTime),
      eventLocation: ticketData.eventLocation,
      eventImage: ticketData.eventImage,
      ticketType: ticketData.ticketType,
      quantity: ticketData.quantity,
      totalAmount: ticketData.totalAmount,
      currency: ticketData.currency,
      ticketId: ticketData.id,
      qrCodeUrl: ticketData.qrCodeUrl || generateQRCodeUrl(ticketData.id, ticketData.eventId),
      ticketUrl: `${baseUrl}/tickets/${ticketData.id}`,
      orderNumber: ticketData.orderNumber,
      eventUrl: `${baseUrl}/event/${ticketData.eventId}`,
    }),
    metadata: {
      ticketId: ticketData.id,
      eventId: ticketData.eventId,
      orderNumber: ticketData.orderNumber,
    },
  };

  return await sendEmail(emailData);
}

// Send event reminder email
export async function sendEventReminderEmail(reminderData: ReminderData) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ticwaka.vercel.app';
  
  const reminderTypeText = reminderData.reminderType === '24h' ? '24-hour' : '1-hour';
  
  const emailData: EmailData = {
    to: reminderData.customerEmail,
    subject: `${reminderData.reminderType === '1h' ? '⏰' : '📅'} ${reminderTypeText} reminder: ${reminderData.eventName}`,
    type: reminderData.reminderType === '24h' ? 'event-reminder-24h' : 'event-reminder-1h',
    template: EventReminderEmail({
      customerName: reminderData.customerName,
      eventName: reminderData.eventName,
      eventDate: formatEmailDate(reminderData.eventDate),
      eventTime: formatEmailTime(reminderData.eventDate, reminderData.eventTime),
      eventLocation: reminderData.eventLocation,
      eventImage: reminderData.eventImage,
      ticketType: reminderData.ticketType,
      quantity: reminderData.quantity,
      ticketUrl: `${baseUrl}/tickets/${reminderData.ticketId}`,
      eventUrl: `${baseUrl}/event/${reminderData.eventId}`,
      reminderType: reminderData.reminderType,
      qrCodeUrl: reminderData.qrCodeUrl || generateQRCodeUrl(reminderData.ticketId, reminderData.eventId),
      directions: `The event is located at ${reminderData.eventLocation}. Please arrive 30 minutes early for check-in.`,
      // Weather info could be fetched from a weather API
      weatherInfo: reminderData.reminderType === '24h' ? {
        temperature: '22°C',
        condition: 'Partly cloudy',
        recommendation: 'Light jacket recommended for evening events',
      } : undefined,
    }),
    metadata: {
      ticketId: reminderData.ticketId,
      eventId: reminderData.eventId,
      reminderType: reminderData.reminderType,
    },
  };

  return await sendEmail(emailData);
}

// Send cancellation notification email
export async function sendCancellationEmail(data: {
  customerName: string;
  customerEmail: string;
  eventName: string;
  orderNumber: string;
  refundAmount: number;
  currency: string;
  reason?: string;
}) {
  const emailData: EmailData = {
    to: data.customerEmail,
    subject: `Cancellation confirmed: ${data.eventName}`,
    type: 'cancellation-notification',
    template: TicketConfirmationEmail({
      customerName: data.customerName,
      eventName: data.eventName,
      eventDate: 'Cancelled',
      eventTime: 'N/A',
      eventLocation: 'N/A',
      ticketType: 'Cancelled',
      quantity: 0,
      totalAmount: data.refundAmount,
      currency: data.currency,
      ticketId: 'CANCELLED',
      qrCodeUrl: '',
      ticketUrl: '#',
      orderNumber: data.orderNumber,
      eventUrl: '#',
    }),
    metadata: {
      orderNumber: data.orderNumber,
      refundAmount: data.refundAmount,
      reason: data.reason,
    },
  };

  return await sendEmail(emailData);
}

// Send waitlist notification email
export async function sendWaitlistAvailableEmail(data: {
  customerName: string;
  customerEmail: string;
  eventName: string;
  eventId: string;
  availableUntil: Date;
}) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ticwaka.vercel.app';
  
  const emailData: EmailData = {
    to: data.customerEmail,
    subject: `🎉 Tickets now available: ${data.eventName}`,
    type: 'waitlist-available',
    template: TicketConfirmationEmail({
      customerName: data.customerName,
      eventName: data.eventName,
      eventDate: `Available until ${format(data.availableUntil, 'MMM do, h:mm a')}`,
      eventTime: 'Limited time offer',
      eventLocation: 'Secure your spot now!',
      ticketType: 'Waitlist Offer',
      quantity: 1,
      totalAmount: 0,
      currency: 'NGN',
      ticketId: 'WAITLIST',
      qrCodeUrl: '',
      ticketUrl: `${baseUrl}/event/${data.eventId}`,
      orderNumber: 'WAITLIST-OFFER',
      eventUrl: `${baseUrl}/event/${data.eventId}`,
    }),
    metadata: {
      eventId: data.eventId,
      availableUntil: data.availableUntil.toISOString(),
    },
  };

  return await sendEmail(emailData);
}

// Send welcome email for new users
export async function sendWelcomeEmail(data: {
  customerName: string;
  customerEmail: string;
}) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ticwaka.vercel.app';
  
  const emailData: EmailData = {
    to: data.customerEmail,
    subject: '🎉 Welcome to Ticwaka!',
    type: 'welcome',
    template: TicketConfirmationEmail({
      customerName: data.customerName,
      eventName: 'Welcome to Ticwaka',
      eventDate: 'Your journey starts now',
      eventTime: 'Anytime',
      eventLocation: 'Everywhere amazing events happen',
      ticketType: 'VIP Member',
      quantity: 1,
      totalAmount: 0,
      currency: 'NGN',
      ticketId: 'WELCOME',
      qrCodeUrl: '',
      ticketUrl: `${baseUrl}/discover`,
      orderNumber: 'WELCOME-PACKAGE',
      eventUrl: `${baseUrl}/discover`,
    }),
    metadata: {
      userType: 'new-user',
    },
  };

  return await sendEmail(emailData);
}

// Batch send reminder emails
export async function sendBatchReminderEmails(reminders: ReminderData[]) {
  const emailPromises = reminders.map(reminder => sendEventReminderEmail(reminder));
  
  const results = await Promise.allSettled(emailPromises);
  
  const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
  const failed = results.length - successful;
  
  console.log(`📊 Batch reminder emails: ${successful} sent, ${failed} failed`);
  
  return {
    total: results.length,
    successful,
    failed,
    results,
  };
} 