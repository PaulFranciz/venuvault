import React from 'react';
import {
  Section,
  Row,
  Column,
  Text,
  Link,
  Img,
  Button,
} from '@react-email/components';
import EmailLayout, { textStyles } from './components/EmailLayout';

interface TicketConfirmationEmailProps {
  customerName: string;
  eventName: string;
  eventDate: string;
  eventTime: string;
  eventLocation: string;
  eventImage?: string;
  ticketType: string;
  quantity: number;
  totalAmount: number;
  currency: string;
  ticketId: string;
  qrCodeUrl: string;
  ticketUrl: string;
  orderNumber: string;
  eventUrl: string;
}

export default function TicketConfirmationEmail({
  customerName,
  eventName,
  eventDate,
  eventTime,
  eventLocation,
  eventImage,
  ticketType,
  quantity,
  totalAmount,
  currency,
  ticketId,
  qrCodeUrl,
  ticketUrl,
  orderNumber,
  eventUrl,
}: TicketConfirmationEmailProps) {
  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount).replace('NGN', '₦');
  };

  return (
    <EmailLayout preview={`Your ticket for ${eventName} is confirmed!`}>
      {/* Hero Section */}
      <Section>
        <Row>
          <Column>
            <Text style={textStyles.h1}>
              🎉 Ticket Confirmed!
            </Text>
            <Text style={textStyles.body}>
              Hi {customerName},
            </Text>
            <Text style={textStyles.body}>
              Great news! Your ticket for <strong>{eventName}</strong> has been confirmed. 
              We're excited to see you there!
            </Text>
          </Column>
        </Row>
      </Section>

      {/* Event Image */}
      {eventImage && (
        <Section>
          <Row>
            <Column>
              <Img
                src={eventImage}
                alt={eventName}
                width="536"
                height="300"
                style={{
                  width: '100%',
                  height: 'auto',
                  borderRadius: '12px',
                  margin: '0 0 24px 0',
                }}
              />
            </Column>
          </Row>
        </Section>
      )}

      {/* Event Details Card */}
      <Section style={textStyles.highlight}>
        <Row>
          <Column>
            <Text style={textStyles.h2}>
              {eventName}
            </Text>
            <Text style={textStyles.body}>
              <strong>📅 Date:</strong> {eventDate}
            </Text>
            <Text style={textStyles.body}>
              <strong>🕐 Time:</strong> {eventTime}
            </Text>
            <Text style={textStyles.body}>
              <strong>📍 Location:</strong> {eventLocation}
            </Text>
          </Column>
        </Row>
      </Section>

      {/* Ticket Details */}
      <Section>
        <Row>
          <Column>
            <Text style={textStyles.h3}>
              Your Ticket Details
            </Text>
          </Column>
        </Row>
        <Row>
          <Column>
            <Text style={textStyles.body}>
              <strong>Order Number:</strong> {orderNumber}
            </Text>
            <Text style={textStyles.body}>
              <strong>Ticket Type:</strong> {ticketType}
            </Text>
            <Text style={textStyles.body}>
              <strong>Quantity:</strong> {quantity} ticket{quantity > 1 ? 's' : ''}
            </Text>
            <Text style={textStyles.body}>
              <strong>Total Paid:</strong> {formatCurrency(totalAmount, currency)}
            </Text>
          </Column>
        </Row>
      </Section>

      {/* QR Code Section */}
      <Section style={textStyles.success}>
        <Row>
          <Column align="center">
            <Text style={textStyles.h3}>
              Your Digital Ticket
            </Text>
            <Text style={textStyles.body}>
              Show this QR code at the event entrance for quick check-in:
            </Text>
            <Img
              src={qrCodeUrl}
              alt="Ticket QR Code"
              width="200"
              height="200"
              style={{
                margin: '16px 0',
                border: '2px solid #10b981',
                borderRadius: '8px',
              }}
            />
            <Text style={textStyles.small}>
              Ticket ID: {ticketId}
            </Text>
          </Column>
        </Row>
      </Section>

      {/* Action Buttons */}
      <Section>
        <Row>
          <Column align="center">
            <Button
              href={ticketUrl}
              style={{
                ...textStyles.button,
                margin: '8px',
              }}
            >
              View Full Ticket
            </Button>
            <Button
              href={eventUrl}
              style={{
                ...textStyles.buttonSecondary,
                margin: '8px',
              }}
            >
              Event Details
            </Button>
          </Column>
        </Row>
      </Section>

      {/* Important Information */}
      <Section style={textStyles.warning}>
        <Row>
          <Column>
            <Text style={textStyles.h3}>
              ⚠️ Important Information
            </Text>
            <Text style={textStyles.body}>
              • Please arrive at least 30 minutes before the event starts
            </Text>
            <Text style={textStyles.body}>
              • Bring a valid ID that matches the name on your ticket
            </Text>
            <Text style={textStyles.body}>
              • Screenshots of the QR code are acceptable for entry
            </Text>
            <Text style={textStyles.body}>
              • Contact support if you need to transfer or refund your ticket
            </Text>
          </Column>
        </Row>
      </Section>

      {/* Add to Calendar */}
      <Section>
        <Row>
          <Column>
            <Text style={textStyles.h3}>
              📅 Add to Calendar
            </Text>
            <Text style={textStyles.body}>
              Don't forget about your event! Add it to your calendar:
            </Text>
          </Column>
        </Row>
        <Row>
          <Column align="center">
            <Link
              href={`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(eventName)}&dates=${eventDate}/${eventDate}&details=${encodeURIComponent(`Event: ${eventName}\nLocation: ${eventLocation}\nTicket: ${ticketType}`)}&location=${encodeURIComponent(eventLocation)}`}
              style={{
                ...textStyles.buttonSecondary,
                margin: '4px',
                display: 'inline-block',
              }}
            >
              Google Calendar
            </Link>
            <Link
              href={`https://outlook.live.com/calendar/0/deeplink/compose?subject=${encodeURIComponent(eventName)}&startdt=${eventDate}&enddt=${eventDate}&body=${encodeURIComponent(`Event: ${eventName}\nLocation: ${eventLocation}`)}&location=${encodeURIComponent(eventLocation)}`}
              style={{
                ...textStyles.buttonSecondary,
                margin: '4px',
                display: 'inline-block',
              }}
            >
              Outlook
            </Link>
          </Column>
        </Row>
      </Section>

      {/* Support Section */}
      <Section>
        <Row>
          <Column>
            <Text style={textStyles.body}>
              Questions about your ticket or the event? We're here to help!
            </Text>
            <Text style={textStyles.body}>
              Contact us at{' '}
              <Link href="mailto:support@ticwaka.com" style={{ color: '#f96521' }}>
                support@ticwaka.com
              </Link>{' '}
              or visit our{' '}
              <Link href="https://ticwaka.com/support" style={{ color: '#f96521' }}>
                Help Center
              </Link>
              .
            </Text>
          </Column>
        </Row>
      </Section>

      {/* Thank You */}
      <Section>
        <Row>
          <Column>
            <Text style={textStyles.body}>
              Thank you for choosing Ticwaka! We hope you have an amazing time at {eventName}.
            </Text>
            <Text style={textStyles.body}>
              See you there! 🎊
            </Text>
          </Column>
        </Row>
      </Section>
    </EmailLayout>
  );
} 