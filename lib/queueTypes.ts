// Queue types and constants
// This file contains types and constants for the queue system
// It should not include any "use server" directives

// Queue names
export const QUEUES = {
  TICKET_RESERVATION: 'ticketReservation',
  PAYMENT_PROCESSING: 'paymentProcessing',
  NOTIFICATION: 'notification',
  WAITLIST_PROCESSING: 'waitlistProcessing',
};

// Define job types
export type TicketReservationJob = {
  eventId: string;
  userId: string;
  ticketTypeId: string;
  quantity: number;
  timestamp: number;
};

export type PaymentProcessingJob = {
  reservationId: string;
  userId: string;
  amount: number;
  paymentMethod: string;
  timestamp: number;
};

export type NotificationJob = {
  userId: string;
  type: 'ticket_reserved' | 'payment_processed' | 'ticket_expired' | 'waitlist_position';
  data: any;
};

export type WaitlistProcessingJob = {
  eventId: string;
  ticketTypeId: string;
  timestamp: number;
};
