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

interface EventReminderEmailProps {
  customerName: string;
  eventName: string;
  eventDate: string;
  eventTime: string;
  eventLocation: string;
  eventImage?: string;
  ticketType: string;
  quantity: number;
  ticketUrl: string;
  eventUrl: string;
  reminderType: '24h' | '1h';
  qrCodeUrl: string;
  directions?: string;
  weatherInfo?: {
    temperature: string;
    condition: string;
    recommendation: string;
  };
}

export default function EventReminderEmail({
  customerName,
  eventName,
  eventDate,
  eventTime,
  eventLocation,
  eventImage,
  ticketType,
  quantity,
  ticketUrl,
  eventUrl,
  reminderType,
  qrCodeUrl,
  directions,
  weatherInfo,
}: EventReminderEmailProps) {
  const getReminderTitle = () => {
    switch (reminderType) {
      case '24h':
        return '📅 Tomorrow\'s Event Reminder';
      case '1h':
        return '⏰ Your Event Starts Soon!';
      default:
        return '📅 Event Reminder';
    }
  };

  const getReminderMessage = () => {
    switch (reminderType) {
      case '24h':
        return `Your event ${eventName} is tomorrow! Here's everything you need to know.`;
      case '1h':
        return `${eventName} starts in about an hour. Time to head out!`;
      default:
        return `Don't forget about your upcoming event: ${eventName}`;
    }
  };

  const getUrgencyStyle = () => {
    return reminderType === '1h' ? textStyles.warning : textStyles.highlight;
  };

  return (
    <EmailLayout preview={`${getReminderTitle()} - ${eventName}`}>
      {/* Hero Section */}
      <Section>
        <Row>
          <Column>
            <Text style={textStyles.h1}>
              {getReminderTitle()}
            </Text>
            <Text style={textStyles.body}>
              Hi {customerName},
            </Text>
            <Text style={textStyles.body}>
              {getReminderMessage()}
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
      <Section style={getUrgencyStyle()}>
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
            <Text style={textStyles.body}>
              <strong>🎫 Your Ticket:</strong> {ticketType} × {quantity}
            </Text>
          </Column>
        </Row>
      </Section>

      {/* Weather Information (for 24h reminders) */}
      {reminderType === '24h' && weatherInfo && (
        <Section style={textStyles.success}>
          <Row>
            <Column>
              <Text style={textStyles.h3}>
                🌤️ Weather Forecast
              </Text>
              <Text style={textStyles.body}>
                <strong>Temperature:</strong> {weatherInfo.temperature}
              </Text>
              <Text style={textStyles.body}>
                <strong>Conditions:</strong> {weatherInfo.condition}
              </Text>
              <Text style={textStyles.body}>
                <strong>Recommendation:</strong> {weatherInfo.recommendation}
              </Text>
            </Column>
          </Row>
        </Section>
      )}

      {/* Quick Actions */}
      <Section>
        <Row>
          <Column align="center">
            <Text style={textStyles.h3}>
              Quick Actions
            </Text>
          </Column>
        </Row>
        <Row>
          <Column align="center">
            <Button
              href={ticketUrl}
              style={{
                ...textStyles.button,
                margin: '8px',
              }}
            >
              View Your Ticket
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

      {/* QR Code for 1h reminder */}
      {reminderType === '1h' && (
        <Section style={textStyles.success}>
          <Row>
            <Column align="center">
              <Text style={textStyles.h3}>
                🎫 Your Entry QR Code
              </Text>
              <Text style={textStyles.body}>
                Save time at the entrance - have this ready:
              </Text>
              <Img
                src={qrCodeUrl}
                alt="Ticket QR Code"
                width="150"
                height="150"
                style={{
                  margin: '16px 0',
                  border: '2px solid #10b981',
                  borderRadius: '8px',
                }}
              />
              <Text style={textStyles.small}>
                Screenshots work too!
              </Text>
            </Column>
          </Row>
        </Section>
      )}

      {/* Directions */}
      {directions && (
        <Section>
          <Row>
            <Column>
              <Text style={textStyles.h3}>
                🗺️ Getting There
              </Text>
              <Text style={textStyles.body}>
                {directions}
              </Text>
            </Column>
          </Row>
          <Row>
            <Column align="center">
              <Link
                href={`https://maps.google.com/maps?q=${encodeURIComponent(eventLocation)}`}
                style={{
                  ...textStyles.buttonSecondary,
                  margin: '8px',
                }}
              >
                Open in Google Maps
              </Link>
              <Link
                href={`https://maps.apple.com/?q=${encodeURIComponent(eventLocation)}`}
                style={{
                  ...textStyles.buttonSecondary,
                  margin: '8px',
                }}
              >
                Open in Apple Maps
              </Link>
            </Column>
          </Row>
        </Section>
      )}

      {/* Pre-Event Checklist */}
      <Section style={reminderType === '1h' ? textStyles.warning : textStyles.highlight}>
        <Row>
          <Column>
            <Text style={textStyles.h3}>
              ✅ Pre-Event Checklist
            </Text>
            {reminderType === '24h' ? (
              <>
                <Text style={textStyles.body}>
                  • Check the weather and dress appropriately
                </Text>
                <Text style={textStyles.body}>
                  • Plan your route and transportation
                </Text>
                <Text style={textStyles.body}>
                  • Charge your phone for the QR code
                </Text>
                <Text style={textStyles.body}>
                  • Bring a valid ID that matches your ticket
                </Text>
                <Text style={textStyles.body}>
                  • Review any event-specific guidelines
                </Text>
              </>
            ) : (
              <>
                <Text style={textStyles.body}>
                  • Have your QR code ready (screenshot or app)
                </Text>
                <Text style={textStyles.body}>
                  • Bring your ID for verification
                </Text>
                <Text style={textStyles.body}>
                  • Leave now to arrive 30 minutes early
                </Text>
                <Text style={textStyles.body}>
                  • Check for any last-minute updates
                </Text>
              </>
            )}
          </Column>
        </Row>
      </Section>

      {/* Contact Information */}
      <Section>
        <Row>
          <Column>
            <Text style={textStyles.h3}>
              📞 Need Help?
            </Text>
            <Text style={textStyles.body}>
              If you have any questions or issues:
            </Text>
            <Text style={textStyles.body}>
              • Email:{' '}
              <Link href="mailto:support@ticwaka.com" style={{ color: '#f96521' }}>
                support@ticwaka.com
              </Link>
            </Text>
            <Text style={textStyles.body}>
              • Help Center:{' '}
              <Link href="https://ticwaka.com/support" style={{ color: '#f96521' }}>
                ticwaka.com/support
              </Link>
            </Text>
            {reminderType === '1h' && (
              <Text style={textStyles.body}>
                • Emergency contact: Available at the venue
              </Text>
            )}
          </Column>
        </Row>
      </Section>

      {/* Closing Message */}
      <Section>
        <Row>
          <Column>
            <Text style={textStyles.body}>
              {reminderType === '24h' 
                ? `We're excited for you to experience ${eventName} tomorrow! Have a fantastic time.`
                : `Time to go! We hope you have an amazing time at ${eventName}. See you there! 🎉`
              }
            </Text>
          </Column>
        </Row>
      </Section>
    </EmailLayout>
  );
} 