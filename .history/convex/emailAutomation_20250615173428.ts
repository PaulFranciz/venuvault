import { query, mutation, action } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { api } from "./_generated/api";

// Email Sequences Management
export const createEmailSequence = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    eventId: v.optional(v.id("events")),
    triggerType: v.union(
      v.literal("ticket_purchase"),
      v.literal("event_reminder"),
      v.literal("post_event"),
      v.literal("waitlist_join"),
      v.literal("user_registration"),
      v.literal("event_update"),
      v.literal("manual")
    ),
    triggerConditions: v.optional(v.object({
      daysBeforeEvent: v.optional(v.number()),
      daysAfterEvent: v.optional(v.number()),
      ticketTypes: v.optional(v.array(v.string())),
      userSegments: v.optional(v.array(v.string())),
    })),
    createdBy: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    const sequenceId = await ctx.db.insert("emailSequences", {
      ...args,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    return sequenceId;
  },
});

export const getEmailSequences = query({
  args: {
    eventId: v.optional(v.id("events")),
    createdBy: v.optional(v.string()),
  },
  handler: async (ctx, { eventId, createdBy }) => {
    let query = ctx.db.query("emailSequences");
    
    if (eventId) {
      query = query.withIndex("by_event", (q) => q.eq("eventId", eventId));
    } else if (createdBy) {
      query = query.withIndex("by_creator", (q) => q.eq("createdBy", createdBy));
    }

    const sequences = await query.collect();
    
    // Get template count for each sequence
    const sequencesWithStats = await Promise.all(
      sequences.map(async (sequence) => {
        const templates = await ctx.db
          .query("emailTemplates")
          .withIndex("by_sequence", (q) => q.eq("sequenceId", sequence._id))
          .collect();
        
        const campaigns = await ctx.db
          .query("emailCampaigns")
          .filter((q) => q.eq(q.field("templateId"), templates[0]?._id))
          .collect();

        return {
          ...sequence,
          templateCount: templates.length,
          campaignCount: campaigns.length,
        };
      })
    );

    return sequencesWithStats;
  },
});

// Email Templates Management
export const createEmailTemplate = mutation({
  args: {
    name: v.string(),
    subject: v.string(),
    htmlContent: v.string(),
    textContent: v.optional(v.string()),
    templateType: v.union(
      v.literal("confirmation"),
      v.literal("reminder"),
      v.literal("update"),
      v.literal("marketing"),
      v.literal("networking"),
      v.literal("feedback")
    ),
    sequenceId: v.optional(v.id("emailSequences")),
    eventId: v.optional(v.id("events")),
    createdBy: v.string(),
    variables: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    const templateId = await ctx.db.insert("emailTemplates", {
      ...args,
      isDefault: false,
      createdAt: now,
      updatedAt: now,
    });

    return templateId;
  },
});

export const getEmailTemplates = query({
  args: {
    sequenceId: v.optional(v.id("emailSequences")),
    eventId: v.optional(v.id("events")),
    templateType: v.optional(v.union(
      v.literal("confirmation"),
      v.literal("reminder"),
      v.literal("update"),
      v.literal("marketing"),
      v.literal("networking"),
      v.literal("feedback")
    )),
    createdBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db.query("emailTemplates");
    
    if (args.sequenceId) {
      query = query.withIndex("by_sequence", (q) => q.eq("sequenceId", args.sequenceId));
    } else if (args.eventId) {
      query = query.withIndex("by_event", (q) => q.eq("eventId", args.eventId));
    } else if (args.templateType) {
      query = query.withIndex("by_type", (q) => q.eq("templateType", args.templateType));
    }

    const templates = await query.collect();
    
    if (args.createdBy) {
      return templates.filter(t => t.createdBy === args.createdBy);
    }
    
    return templates;
  },
});

// Email Campaigns Management
export const createEmailCampaign = mutation({
  args: {
    name: v.string(),
    subject: v.string(),
    templateId: v.id("emailTemplates"),
    eventId: v.optional(v.id("events")),
    createdBy: v.string(),
    scheduledFor: v.optional(v.number()),
    targetAudience: v.object({
      type: v.union(
        v.literal("all_attendees"),
        v.literal("ticket_holders"),
        v.literal("waitlist"),
        v.literal("custom_segment")
      ),
      filters: v.optional(v.object({
        ticketTypes: v.optional(v.array(v.string())),
        purchaseDateRange: v.optional(v.object({
          start: v.number(),
          end: v.number(),
        })),
        userSegments: v.optional(v.array(v.string())),
      })),
    }),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Calculate recipient count based on target audience
    let recipientCount = 0;
    
    if (args.eventId) {
      if (args.targetAudience.type === "ticket_holders") {
        const tickets = await ctx.db
          .query("tickets")
          .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
          .filter((q) => q.or(q.eq(q.field("status"), "valid"), q.eq(q.field("status"), "used")))
          .collect();
        recipientCount = tickets.length;
      } else if (args.targetAudience.type === "waitlist") {
        const waitlist = await ctx.db
          .query("waitingList")
          .withIndex("by_event_status", (q) => q.eq("eventId", args.eventId).eq("status", "waiting"))
          .collect();
        recipientCount = waitlist.length;
      }
    }

    const campaignId = await ctx.db.insert("emailCampaigns", {
      ...args,
      status: args.scheduledFor ? "scheduled" : "draft",
      recipientCount,
      createdAt: now,
      updatedAt: now,
    });

    return campaignId;
  },
});

export const getEmailCampaigns = query({
  args: {
    eventId: v.optional(v.id("events")),
    createdBy: v.optional(v.string()),
    status: v.optional(v.union(
      v.literal("draft"),
      v.literal("scheduled"),
      v.literal("sending"),
      v.literal("sent"),
      v.literal("cancelled")
    )),
  },
  handler: async (ctx, args) => {
    let query = ctx.db.query("emailCampaigns");
    
    if (args.eventId) {
      query = query.withIndex("by_event", (q) => q.eq("eventId", args.eventId));
    } else if (args.createdBy) {
      query = query.withIndex("by_creator", (q) => q.eq("createdBy", args.createdBy));
    } else if (args.status) {
      query = query.withIndex("by_status", (q) => q.eq("status", args.status));
    }

    const campaigns = await query.collect();
    
    // Get template and analytics data for each campaign
    const campaignsWithStats = await Promise.all(
      campaigns.map(async (campaign) => {
        const template = await ctx.db.get(campaign.templateId);
        
        const analytics = await ctx.db
          .query("emailAnalytics")
          .withIndex("by_campaign", (q) => q.eq("campaignId", campaign._id))
          .collect();

        const stats = {
          sent: analytics.filter(a => a.status === "sent").length,
          delivered: analytics.filter(a => a.status === "delivered").length,
          opened: analytics.filter(a => a.status === "opened").length,
          clicked: analytics.filter(a => a.status === "clicked").length,
          bounced: analytics.filter(a => a.status === "bounced").length,
        };

        return {
          ...campaign,
          template,
          stats,
          openRate: stats.delivered > 0 ? (stats.opened / stats.delivered * 100).toFixed(1) : "0",
          clickRate: stats.delivered > 0 ? (stats.clicked / stats.delivered * 100).toFixed(1) : "0",
        };
      })
    );

    return campaignsWithStats;
  },
});

// Email Analytics
export const recordEmailAnalytics = mutation({
  args: {
    campaignId: v.optional(v.id("emailCampaigns")),
    sequenceId: v.optional(v.id("emailSequences")),
    templateId: v.id("emailTemplates"),
    eventId: v.optional(v.id("events")),
    recipientEmail: v.string(),
    recipientUserId: v.optional(v.string()),
    emailId: v.string(),
    status: v.union(
      v.literal("sent"),
      v.literal("delivered"),
      v.literal("opened"),
      v.literal("clicked"),
      v.literal("bounced"),
      v.literal("complained")
    ),
    clickedLinks: v.optional(v.array(v.string())),
    userAgent: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
    location: v.optional(v.object({
      country: v.optional(v.string()),
      city: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Check if analytics record already exists for this email and status
    const existing = await ctx.db
      .query("emailAnalytics")
      .filter((q) => 
        q.and(
          q.eq(q.field("emailId"), args.emailId),
          q.eq(q.field("status"), args.status)
        )
      )
      .first();

    if (existing) {
      // Update existing record with new data
      await ctx.db.patch(existing._id, {
        clickedLinks: args.clickedLinks,
        userAgent: args.userAgent,
        ipAddress: args.ipAddress,
        location: args.location,
        ...(args.status === "delivered" && { deliveredAt: now }),
        ...(args.status === "opened" && { openedAt: now }),
        ...(args.status === "clicked" && { clickedAt: now }),
      });
      return existing._id;
    }

    // Create new analytics record
    const analyticsId = await ctx.db.insert("emailAnalytics", {
      ...args,
      sentAt: now,
      ...(args.status === "delivered" && { deliveredAt: now }),
      ...(args.status === "opened" && { openedAt: now }),
      ...(args.status === "clicked" && { clickedAt: now }),
    });

    return analyticsId;
  },
});

export const getEmailAnalytics = query({
  args: {
    campaignId: v.optional(v.id("emailCampaigns")),
    eventId: v.optional(v.id("events")),
    templateId: v.optional(v.id("emailTemplates")),
    dateRange: v.optional(v.object({
      start: v.number(),
      end: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    let query = ctx.db.query("emailAnalytics");
    
    if (args.campaignId) {
      query = query.withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId));
    } else if (args.eventId) {
      query = query.withIndex("by_event", (q) => q.eq("eventId", args.eventId));
    } else if (args.templateId) {
      query = query.withIndex("by_template", (q) => q.eq("templateId", args.templateId));
    }

    let analytics = await query.collect();
    
    // Filter by date range if provided
    if (args.dateRange) {
      analytics = analytics.filter(a => 
        a.sentAt >= args.dateRange!.start && a.sentAt <= args.dateRange!.end
      );
    }

    // Calculate aggregate statistics
    const stats = {
      totalSent: analytics.filter(a => a.status === "sent").length,
      totalDelivered: analytics.filter(a => a.status === "delivered").length,
      totalOpened: analytics.filter(a => a.status === "opened").length,
      totalClicked: analytics.filter(a => a.status === "clicked").length,
      totalBounced: analytics.filter(a => a.status === "bounced").length,
      totalComplaints: analytics.filter(a => a.status === "complained").length,
    };

    const deliveryRate = stats.totalSent > 0 ? (stats.totalDelivered / stats.totalSent * 100).toFixed(1) : "0";
    const openRate = stats.totalDelivered > 0 ? (stats.totalOpened / stats.totalDelivered * 100).toFixed(1) : "0";
    const clickRate = stats.totalDelivered > 0 ? (stats.totalClicked / stats.totalDelivered * 100).toFixed(1) : "0";
    const bounceRate = stats.totalSent > 0 ? (stats.totalBounced / stats.totalSent * 100).toFixed(1) : "0";

    // Get top clicked links
    const allClickedLinks = analytics
      .filter(a => a.clickedLinks && a.clickedLinks.length > 0)
      .flatMap(a => a.clickedLinks || []);
    
    const linkCounts = allClickedLinks.reduce((acc, link) => {
      acc[link] = (acc[link] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topLinks = Object.entries(linkCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([link, count]) => ({ link, count }));

    // Get engagement over time (daily)
    const dailyStats = analytics.reduce((acc, record) => {
      const date = new Date(record.sentAt).toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = { sent: 0, delivered: 0, opened: 0, clicked: 0 };
      }
      acc[date][record.status]++;
      return acc;
    }, {} as Record<string, any>);

    return {
      stats,
      rates: {
        delivery: deliveryRate,
        open: openRate,
        click: clickRate,
        bounce: bounceRate,
      },
      topLinks,
      dailyStats: Object.entries(dailyStats).map(([date, stats]) => ({
        date,
        ...stats,
      })),
      rawData: analytics,
    };
  },
});

// Automated Email Triggers
export const triggerAutomatedEmails = action({
  args: {
    triggerType: v.union(
      v.literal("ticket_purchase"),
      v.literal("event_reminder"),
      v.literal("post_event"),
      v.literal("waitlist_join"),
      v.literal("user_registration"),
      v.literal("event_update")
    ),
    eventId: v.optional(v.id("events")),
    userId: v.string(),
    metadata: v.optional(v.object({
      ticketId: v.optional(v.id("tickets")),
      ticketType: v.optional(v.string()),
      purchaseAmount: v.optional(v.number()),
    })),
  },
  handler: async (ctx, args) => {
    // Find active sequences for this trigger type
    const sequences = await ctx.runQuery(api.emailAutomation.getEmailSequences, {
      eventId: args.eventId,
    });

    const relevantSequences = sequences.filter(seq => 
      seq.triggerType === args.triggerType && seq.isActive
    );

    const results = [];

    for (const sequence of relevantSequences) {
      // Get templates for this sequence
      const templates = await ctx.runQuery(api.emailAutomation.getEmailTemplates, {
        sequenceId: sequence._id,
      });

      for (const template of templates) {
        // Create and send campaign
        const campaignId = await ctx.runMutation(api.emailAutomation.createEmailCampaign, {
          name: `Auto: ${sequence.name} - ${template.name}`,
          subject: template.subject,
          templateId: template._id,
          eventId: args.eventId,
          createdBy: sequence.createdBy,
          targetAudience: {
            type: "custom_segment", // Will be filtered to specific user
          },
        });

        // Send email immediately for automated triggers
        // This would integrate with your existing email service
        results.push({
          sequenceId: sequence._id,
          templateId: template._id,
          campaignId,
          status: "triggered",
        });
      }
    }

    return results;
  },
});

// Send Campaign
export const sendEmailCampaign = action({
  args: {
    campaignId: v.id("emailCampaigns"),
  },
  handler: async (ctx, args) => {
    const campaign = await ctx.runQuery(api.emailAutomation.getEmailCampaigns, {});
    const targetCampaign = campaign.find(c => c._id === args.campaignId);
    
    if (!targetCampaign) {
      throw new Error("Campaign not found");
    }

    if (targetCampaign.status !== "draft" && targetCampaign.status !== "scheduled") {
      throw new Error("Campaign cannot be sent in current status");
    }

    // Update campaign status to sending
    await ctx.runMutation(api.emailAutomation.updateCampaignStatus, {
      campaignId: args.campaignId,
      status: "sending",
    });

    // Get recipients based on target audience
    let recipients: string[] = [];
    
    if (targetCampaign.eventId) {
      if (targetCampaign.targetAudience.type === "ticket_holders") {
        const tickets = await ctx.runQuery(api.tickets.getEventTickets, {
          eventId: targetCampaign.eventId,
        });
        // This would need to be implemented to get user emails from tickets
        recipients = tickets.map(t => t.userId); // Would need to resolve to emails
      }
    }

    // Send emails (integrate with your email service)
    const results = [];
    for (const recipient of recipients) {
      // Record analytics
      const analyticsId = await ctx.runMutation(api.emailAutomation.recordEmailAnalytics, {
        campaignId: args.campaignId,
        templateId: targetCampaign.templateId,
        eventId: targetCampaign.eventId,
        recipientEmail: recipient,
        emailId: `campaign_${args.campaignId}_${Date.now()}`,
        status: "sent",
      });
      
      results.push({ recipient, analyticsId });
    }

    // Update campaign status to sent
    await ctx.runMutation(api.emailAutomation.updateCampaignStatus, {
      campaignId: args.campaignId,
      status: "sent",
      sentAt: Date.now(),
    });

    return {
      campaignId: args.campaignId,
      recipientCount: recipients.length,
      results,
    };
  },
});

export const updateCampaignStatus = mutation({
  args: {
    campaignId: v.id("emailCampaigns"),
    status: v.union(
      v.literal("draft"),
      v.literal("scheduled"),
      v.literal("sending"),
      v.literal("sent"),
      v.literal("cancelled")
    ),
    sentAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.campaignId, {
      status: args.status,
      updatedAt: Date.now(),
      ...(args.sentAt && { sentAt: args.sentAt }),
    });
  },
}); 