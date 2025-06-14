import { useState } from 'react';
import { toast } from 'sonner';

// Types for email sending
interface SendEmailOptions {
  endpoint: string;
  data: any;
  successMessage?: string;
  errorMessage?: string;
}

interface EmailResult {
  success: boolean;
  emailId?: string;
  error?: string;
}

export function useEmailIntegration() {
  const [isLoading, setIsLoading] = useState(false);
  const [lastResult, setLastResult] = useState<EmailResult | null>(null);

  // Generic email sending function
  const sendEmail = async (options: SendEmailOptions): Promise<EmailResult> => {
    setIsLoading(true);
    
    try {
      const response = await fetch(options.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.NEXT_PUBLIC_API_SECRET_TOKEN || '',
        },
        body: JSON.stringify(options.data),
      });

      const result = await response.json();

      if (result.success) {
        if (options.successMessage) {
          toast.success(options.successMessage);
        }
        setLastResult({ success: true, emailId: result.emailId });
        return { success: true, emailId: result.emailId };
      } else {
        const errorMsg = options.errorMessage || result.message || 'Failed to send email';
        toast.error(errorMsg);
        setLastResult({ success: false, error: result.error });
        return { success: false, error: result.error };
      }
    } catch (error) {
      const errorMsg = options.errorMessage || 'Network error while sending email';
      toast.error(errorMsg);
      const errorResult = { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
      setLastResult(errorResult);
      return errorResult;
    } finally {
      setIsLoading(false);
    }
  };

  // Send ticket confirmation email
  const sendTicketConfirmation = async (ticketData: {
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
    qrCodeUrl?: string;
    eventId: string;
  }) => {
    return await sendEmail({
      endpoint: '/api/emails/send-confirmation',
      data: ticketData,
      successMessage: '✅ Confirmation email sent!',
      errorMessage: '❌ Failed to send confirmation email',
    });
  };

  // Send event reminder email
  const sendEventReminder = async (reminderData: {
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
    qrCodeUrl?: string;
    eventId: string;
    reminderType: '24h' | '1h';
  }) => {
    return await sendEmail({
      endpoint: '/api/emails/send-reminder',
      data: reminderData,
      successMessage: '📅 Reminder email sent!',
      errorMessage: '❌ Failed to send reminder email',
    });
  };

  // Send welcome email
  const sendWelcomeEmail = async (userData: {
    customerName: string;
    customerEmail: string;
  }) => {
    return await sendEmail({
      endpoint: '/api/emails/send-welcome',
      data: userData,
      successMessage: '🎉 Welcome email sent!',
      errorMessage: '❌ Failed to send welcome email',
    });
  };

  // Send cancellation email
  const sendCancellationEmail = async (cancellationData: {
    customerName: string;
    customerEmail: string;
    eventName: string;
    orderNumber: string;
    refundAmount: number;
    currency: string;
    reason?: string;
  }) => {
    return await sendEmail({
      endpoint: '/api/emails/send-cancellation',
      data: cancellationData,
      successMessage: '📧 Cancellation email sent!',
      errorMessage: '❌ Failed to send cancellation email',
    });
  };

  // Send waitlist notification
  const sendWaitlistNotification = async (waitlistData: {
    customerName: string;
    customerEmail: string;
    eventName: string;
    eventId: string;
    availableUntil: Date;
  }) => {
    return await sendEmail({
      endpoint: '/api/emails/send-waitlist',
      data: waitlistData,
      successMessage: '🎫 Waitlist notification sent!',
      errorMessage: '❌ Failed to send waitlist notification',
    });
  };

  // Test email functionality
  const testEmailSystem = async (testEmail: string) => {
    return await sendEmail({
      endpoint: '/api/emails/test',
      data: { email: testEmail },
      successMessage: '✅ Test email sent successfully!',
      errorMessage: '❌ Email system test failed',
    });
  };

  return {
    // State
    isLoading,
    lastResult,
    
    // Functions
    sendTicketConfirmation,
    sendEventReminder,
    sendWelcomeEmail,
    sendCancellationEmail,
    sendWaitlistNotification,
    testEmailSystem,
    
    // Generic function for custom emails
    sendEmail,
  };
}

// Helper hook for automatic email sending based on events
export function useAutoEmailSender() {
  const { sendTicketConfirmation, sendWelcomeEmail } = useEmailIntegration();

  // Auto-send confirmation email when ticket is purchased
  const handleTicketPurchased = async (ticketData: any) => {
    try {
      await sendTicketConfirmation(ticketData);
    } catch (error) {
      console.error('Failed to send automatic confirmation email:', error);
    }
  };

  // Auto-send welcome email for new users
  const handleUserRegistered = async (userData: { name: string; email: string }) => {
    try {
      await sendWelcomeEmail({
        customerName: userData.name,
        customerEmail: userData.email,
      });
    } catch (error) {
      console.error('Failed to send automatic welcome email:', error);
    }
  };

  return {
    handleTicketPurchased,
    handleUserRegistered,
  };
} 