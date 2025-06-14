import React from 'react';
import {
  Html,
  Head,
  Font,
  Preview,
  Body,
  Container,
  Section,
  Row,
  Column,
  Img,
  Text,
  Link,
  Hr,
} from '@react-email/components';

interface EmailLayoutProps {
  preview: string;
  children: React.ReactNode;
}

export default function EmailLayout({ preview, children }: EmailLayoutProps) {
  return (
    <Html>
      <Head>
        <Font
          fontFamily="Inter"
          fallbackFontFamily="Arial"
          webFont={{
            url: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
            format: 'woff2',
          }}
          fontWeight={400}
          fontStyle="normal"
        />
      </Head>
      <Preview>{preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Row>
              <Column>
                <Img
                  src="https://ticwaka.vercel.app/logo.png"
                  width="120"
                  height="40"
                  alt="Ticwaka"
                  style={logo}
                />
              </Column>
            </Row>
          </Section>

          {/* Main Content */}
          <Section style={content}>
            {children}
          </Section>

          {/* Footer */}
          <Section style={footer}>
            <Hr style={hr} />
            <Row>
              <Column>
                <Text style={footerText}>
                  <strong>Ticwaka</strong> - Your Premier Event Ticketing Platform
                </Text>
                <Text style={footerText}>
                  Making events accessible, secure, and memorable for everyone.
                </Text>
              </Column>
            </Row>
            
            <Row style={socialRow}>
              <Column align="center">
                <Link href="https://twitter.com/ticwaka" style={socialLink}>
                  Twitter
                </Link>
                <Text style={socialSeparator}>•</Text>
                <Link href="https://instagram.com/ticwaka" style={socialLink}>
                  Instagram
                </Link>
                <Text style={socialSeparator}>•</Text>
                <Link href="https://linkedin.com/company/ticwaka" style={socialLink}>
                  LinkedIn
                </Link>
              </Column>
            </Row>

            <Row>
              <Column>
                <Text style={footerSmall}>
                  © 2024 Ticwaka. All rights reserved.
                </Text>
                <Text style={footerSmall}>
                  <Link href="https://ticwaka.com/privacy" style={footerLink}>
                    Privacy Policy
                  </Link>
                  {' • '}
                  <Link href="https://ticwaka.com/terms" style={footerLink}>
                    Terms of Service
                  </Link>
                  {' • '}
                  <Link href="https://ticwaka.com/support" style={footerLink}>
                    Support
                  </Link>
                </Text>
              </Column>
            </Row>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// Styles
const main = {
  backgroundColor: '#f9f6f0',
  fontFamily: 'Inter, Arial, sans-serif',
};

const container = {
  margin: '0 auto',
  padding: '20px 0 48px',
  width: '600px',
  maxWidth: '100%',
};

const header = {
  backgroundColor: '#ffffff',
  borderRadius: '12px 12px 0 0',
  padding: '24px 32px',
  borderBottom: '1px solid #e5e7eb',
};

const logo = {
  margin: '0',
};

const content = {
  backgroundColor: '#ffffff',
  padding: '32px',
  borderRadius: '0 0 12px 12px',
};

const footer = {
  marginTop: '32px',
  padding: '24px 32px',
  backgroundColor: '#f8fafc',
  borderRadius: '12px',
};

const hr = {
  borderColor: '#e5e7eb',
  margin: '0 0 24px 0',
};

const footerText = {
  color: '#6b7280',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '0 0 8px 0',
  textAlign: 'center' as const,
};

const footerSmall = {
  color: '#9ca3af',
  fontSize: '12px',
  lineHeight: '16px',
  margin: '8px 0 0 0',
  textAlign: 'center' as const,
};

const socialRow = {
  marginTop: '16px',
  marginBottom: '16px',
};

const socialLink = {
  color: '#f96521',
  fontSize: '14px',
  textDecoration: 'none',
  fontWeight: '500',
};

const socialSeparator = {
  color: '#9ca3af',
  fontSize: '14px',
  margin: '0 8px',
};

const footerLink = {
  color: '#6b7280',
  textDecoration: 'none',
};

// Common text styles for reuse
export const textStyles = {
  h1: {
    color: '#502413',
    fontSize: '28px',
    fontWeight: '700',
    lineHeight: '36px',
    margin: '0 0 24px 0',
  },
  h2: {
    color: '#502413',
    fontSize: '24px',
    fontWeight: '600',
    lineHeight: '32px',
    margin: '0 0 16px 0',
  },
  h3: {
    color: '#502413',
    fontSize: '20px',
    fontWeight: '600',
    lineHeight: '28px',
    margin: '0 0 12px 0',
  },
  body: {
    color: '#374151',
    fontSize: '16px',
    lineHeight: '24px',
    margin: '0 0 16px 0',
  },
  small: {
    color: '#6b7280',
    fontSize: '14px',
    lineHeight: '20px',
    margin: '0 0 12px 0',
  },
  button: {
    backgroundColor: '#f96521',
    borderRadius: '8px',
    color: '#ffffff',
    fontSize: '16px',
    fontWeight: '600',
    padding: '12px 24px',
    textDecoration: 'none',
    display: 'inline-block',
    textAlign: 'center' as const,
  },
  buttonSecondary: {
    backgroundColor: 'transparent',
    border: '2px solid #f96521',
    borderRadius: '8px',
    color: '#f96521',
    fontSize: '16px',
    fontWeight: '600',
    padding: '10px 22px',
    textDecoration: 'none',
    display: 'inline-block',
    textAlign: 'center' as const,
  },
  highlight: {
    backgroundColor: '#fcf9f4',
    border: '1px solid #f96521',
    borderRadius: '8px',
    padding: '16px',
    margin: '16px 0',
  },
  warning: {
    backgroundColor: '#fef3c7',
    border: '1px solid #f59e0b',
    borderRadius: '8px',
    padding: '16px',
    margin: '16px 0',
  },
  success: {
    backgroundColor: '#d1fae5',
    border: '1px solid #10b981',
    borderRadius: '8px',
    padding: '16px',
    margin: '16px 0',
  },
}; 