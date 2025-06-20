import { Resend } from 'resend';
import { render } from '@react-email/render';
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

const resend = new Resend(process.env.RESEND_API_KEY);
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// Enhanced email configuration
export const ADVANCED_EMAIL_CONFIG = {
  from: process.env.EMAIL_FROM || 'EventPulse <noreply@eventpulse.com>',
  replyTo: process.env.EMAIL_REPLY_TO || 'support@eventpulse.com',
  domain: process.env.NEXT_PUBLIC_APP_URL || 'https://eventpulse.vercel.app',
  webhookUrl: process.env.NEXT_PUBLIC_APP_URL + '/api/webhooks/email-analytics',
} as const;

// Enhanced email types
export type AdvancedEmailType = 
  | 'campaign'
  | 'sequence'
  | 'announcement'
  | 'reminder'
  | 'confirmation'
  | 'networking'
  | 'feedback';

// Email sending interface with analytics
export interface AdvancedEmailData {
  to: string | string[];
  subject: string;
  template: React.ReactElement;
  type: AdvancedEmailType;
  campaignId?: Id<"emailCampaigns">;
  sequenceId?: Id<"emailSequences">;
  templateId: Id<"emailTemplates">;
  eventId?: Id<"events">;
  metadata?: Record<string, any>;
  scheduledFor?: Date;
  trackOpens?: boolean;
  trackClicks?: boolean;
}

// Template variable replacement
export function replaceTemplateVariables(
  content: string, 
  variables: Record<string, string>
): string {
  let processedContent = content;
  
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    processedContent = processedContent.replace(regex, value);
  });
  
  return processedContent;
}

// Enhanced email sending function
export async function sendAdvancedEmail(data: AdvancedEmailData) {
  try {
    // Validate required environment variables
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY environment variable is not set');
    }

    // Render React component to HTML
    const html = await render(data.template);

    // Prepare tags for analytics tracking
    const tags = [
      { name: 'type', value: data.type },
      { name: 'template_id', value: data.templateId },
      { name: 'environment', value: process.env.NODE_ENV || 'development' },
    ];

    if (data.campaignId) {
      tags.push({ name: 'campaign_id', value: data.campaignId });
    }

    if (data.sequenceId) {
      tags.push({ name: 'sequence_id', value: data.sequenceId });
    }

    if (data.eventId) {
      tags.push({ name: 'event_id', value: data.eventId });
    }

    // Send email via Resend
    const result = await resend.emails.send({
      from: ADVANCED_EMAIL_CONFIG.from,
      to: Array.isArray(data.to) ? data.to : [data.to],
      subject: data.subject,
      html,
      replyTo: ADVANCED_EMAIL_CONFIG.replyTo,
      tags,
      headers: {
        'X-Email-Type': data.type,
        'X-App-Version': '2.0.0',
        'X-Template-ID': data.templateId,
      },
      scheduledAt: data.scheduledFor?.toISOString(),
    });

    // Record initial analytics (sent status)
    if (result.data?.id) {
      await convex.mutation(api.emailAutomation.recordEmailAnalytics, {
        campaignId: data.campaignId,
        sequenceId: data.sequenceId,
        templateId: data.templateId,
        eventId: data.eventId,
        recipientEmail: Array.isArray(data.to) ? data.to[0] : data.to,
        emailId: result.data.id,
        status: "sent",
      });
    }

    // Log success
    console.log(`✅ Advanced email sent successfully:`, {
      id: result.data?.id,
      type: data.type,
      to: data.to,
      subject: data.subject,
      campaignId: data.campaignId,
      templateId: data.templateId,
    });

    return {
      success: true,
      id: result.data?.id,
      error: null,
    };

  } catch (error) {
    // Log error
    console.error(`❌ Failed to send advanced email:`, {
      type: data.type,
      to: data.to,
      subject: data.subject,
      campaignId: data.campaignId,
      templateId: data.templateId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return {
      success: false,
      id: null,
      error: error instanceof Error ? error.message : 'Failed to send email',
    };
  }
}

// Batch email sending with rate limiting
export async function sendBatchAdvancedEmails(
  emails: AdvancedEmailData[],
  options: {
    batchSize?: number;
    delayBetweenBatches?: number;
    maxRetries?: number;
  } = {}
) {
  const {
    batchSize = 10,
    delayBetweenBatches = 1000,
    maxRetries = 3,
  } = options;

  const results = [];
  const batches = [];

  // Split emails into batches
  for (let i = 0; i < emails.length; i += batchSize) {
    batches.push(emails.slice(i, i + batchSize));
  }

  console.log(`📧 Sending ${emails.length} emails in ${batches.length} batches`);

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];
    
    console.log(`📦 Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} emails)`);

    // Send batch with retry logic
    const batchResults = await Promise.allSettled(
      batch.map(async (email) => {
        let lastError;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            return await sendAdvancedEmail(email);
          } catch (error) {
            lastError = error;
            if (attempt < maxRetries) {
              console.log(`⚠️ Retry ${attempt}/${maxRetries} for email to ${email.to}`);
              await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            }
          }
        }
        
        throw lastError;
      })
    );

    results.push(...batchResults);

    // Delay between batches (except for the last batch)
    if (batchIndex < batches.length - 1) {
      await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
    }
  }

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

// Campaign email sender
export async function sendCampaignEmails(
  campaignId: Id<"emailCampaigns">,
  recipients: Array<{
    email: string;
    name: string;
    variables: Record<string, string>;
  }>,
  template: {
    subject: string;
    htmlContent: string;
    templateId: Id<"emailTemplates">;
  },
  eventId?: Id<"events">
) {
  const emails: AdvancedEmailData[] = recipients.map(recipient => ({
    to: recipient.email,
    subject: replaceTemplateVariables(template.subject, recipient.variables),
    template: createEmailFromHTML(
      replaceTemplateVariables(template.htmlContent, recipient.variables)
    ),
    type: 'campaign',
    campaignId,
    templateId: template.templateId,
    eventId,
    trackOpens: true,
    trackClicks: true,
  }));

  return await sendBatchAdvancedEmails(emails);
}

// Sequence email sender
export async function sendSequenceEmail(
  sequenceId: Id<"emailSequences">,
  templateId: Id<"emailTemplates">,
  recipient: {
    email: string;
    name: string;
    variables: Record<string, string>;
  },
  template: {
    subject: string;
    htmlContent: string;
  },
  eventId?: Id<"events">
) {
  const emailData: AdvancedEmailData = {
    to: recipient.email,
    subject: replaceTemplateVariables(template.subject, recipient.variables),
    template: createEmailFromHTML(
      replaceTemplateVariables(template.htmlContent, recipient.variables)
    ),
    type: 'sequence',
    sequenceId,
    templateId,
    eventId,
    trackOpens: true,
    trackClicks: true,
  };

  return await sendAdvancedEmail(emailData);
}

// Announcement email sender
export async function sendAnnouncementEmail(
  announcement: {
    title: string;
    content: string;
    type: string;
  },
  recipients: string[],
  eventId: Id<"events">,
  templateId: Id<"emailTemplates">
) {
  const emails: AdvancedEmailData[] = recipients.map(email => ({
    to: email,
    subject: `📢 ${announcement.title}`,
    template: createAnnouncementEmail(announcement),
    type: 'announcement',
    templateId,
    eventId,
    trackOpens: true,
    trackClicks: true,
  }));

  return await sendBatchAdvancedEmails(emails);
}

// Helper function to create email from HTML string
function createEmailFromHTML(htmlContent: string): React.ReactElement {
  return {
    type: 'div',
    props: {
      dangerouslySetInnerHTML: { __html: htmlContent }
    }
  } as any;
}

// Helper function to create announcement email
function createAnnouncementEmail(announcement: {
  title: string;
  content: string;
  type: string;
}): React.ReactElement {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #3b82f6; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 24px;">${announcement.title}</h1>
      </div>
      <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
        <div style="margin-bottom: 20px;">
          <span style="background: #fef3c7; color: #92400e; padding: 4px 12px; border-radius: 20px; font-size: 12px; text-transform: uppercase; font-weight: bold;">
            ${announcement.type.replace('_', ' ')}
          </span>
        </div>
        <div style="line-height: 1.6; color: #374151;">
          ${announcement.content.replace(/\n/g, '<br>')}
        </div>
      </div>
      <div style="text-align: center; padding: 20px; color: #6b7280; font-size: 12px;">
        <p>Best regards,<br>The EventPulse Team</p>
      </div>
    </div>
  `;

  return createEmailFromHTML(html);
}

// Email template builder
export class EmailTemplateBuilder {
  private template: string = '';
  private variables: Record<string, string> = {};

  constructor(baseTemplate?: string) {
    this.template = baseTemplate || this.getDefaultTemplate();
  }

  setVariable(key: string, value: string): this {
    this.variables[key] = value;
    return this;
  }

  setVariables(variables: Record<string, string>): this {
    this.variables = { ...this.variables, ...variables };
    return this;
  }

  addSection(content: string): this {
    this.template = this.template.replace(
      '{{content}}',
      `${content}\n{{content}}`
    );
    return this;
  }

  build(): string {
    return replaceTemplateVariables(this.template, this.variables);
  }

  private getDefaultTemplate(): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #3b82f6; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">{{title}}</h1>
        </div>
        <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
          {{content}}
        </div>
        <div style="text-align: center; padding: 20px; color: #6b7280; font-size: 12px;">
          <p>Best regards,<br>{{organizerName}}</p>
        </div>
      </div>
    `;
  }
}

// Email analytics helper
export async function getEmailPerformanceMetrics(
  campaignId?: Id<"emailCampaigns">,
  eventId?: Id<"events">,
  dateRange?: { start: number; end: number }
) {
  try {
    const analytics = await convex.query(api.emailAutomation.getEmailAnalytics, {
      campaignId,
      eventId,
      dateRange,
    });

    return {
      ...analytics,
      insights: generateEmailInsights(analytics),
    };
  } catch (error) {
    console.error('Error fetching email performance metrics:', error);
    return null;
  }
}

// Generate email insights
function generateEmailInsights(analytics: any) {
  const insights = [];
  
  const openRate = parseFloat(analytics.rates.open);
  const clickRate = parseFloat(analytics.rates.click);
  const bounceRate = parseFloat(analytics.rates.bounce);

  // Open rate insights
  if (openRate > 25) {
    insights.push({
      type: 'success',
      title: 'Excellent Open Rate',
      message: `Your ${openRate}% open rate is above industry average (21.3%)`,
    });
  } else if (openRate < 15) {
    insights.push({
      type: 'warning',
      title: 'Low Open Rate',
      message: 'Consider improving your subject lines and sender reputation',
    });
  }

  // Click rate insights
  if (clickRate > 3) {
    insights.push({
      type: 'success',
      title: 'Great Click Rate',
      message: `Your ${clickRate}% click rate shows strong engagement`,
    });
  } else if (clickRate < 1) {
    insights.push({
      type: 'info',
      title: 'Improve Click Rate',
      message: 'Try adding more compelling calls-to-action and relevant content',
    });
  }

  // Bounce rate insights
  if (bounceRate > 2) {
    insights.push({
      type: 'error',
      title: 'High Bounce Rate',
      message: 'Clean your email list to improve deliverability',
    });
  }

  return insights;
} 