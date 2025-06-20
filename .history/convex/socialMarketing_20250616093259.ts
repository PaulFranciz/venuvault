import { query, mutation, action } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { api } from "./_generated/api";

// Social Media Sharing
export const createSocialPost = mutation({
  args: {
    eventId: v.id("events"),
    platform: v.union(
      v.literal("twitter"),
      v.literal("facebook"),
      v.literal("instagram"),
      v.literal("linkedin")
    ),
    content: v.string(),
    mediaUrls: v.optional(v.array(v.string())),
    scheduledFor: v.optional(v.number()),
    createdBy: v.string(),
  },
  handler: async (ctx, args) => {
    const postId = await ctx.db.insert("socialPosts", {
      ...args,
      status: args.scheduledFor ? "scheduled" : "draft",
      createdAt: Date.now(),
    });

    return postId;
  },
});

export const getSocialPosts = query({
  args: {
    eventId: v.id("events"),
    platform: v.optional(v.union(
      v.literal("twitter"),
      v.literal("facebook"),
      v.literal("instagram"),
      v.literal("linkedin")
    )),
    status: v.optional(v.union(
      v.literal("draft"),
      v.literal("scheduled"),
      v.literal("posted"),
      v.literal("failed")
    )),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("socialPosts")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId));

    let posts = await query.collect();

    if (args.platform) {
      posts = posts.filter(p => p.platform === args.platform);
    }

    if (args.status) {
      posts = posts.filter(p => p.status === args.status);
    }

    return posts.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const generateSocialContent = action({
  args: {
    eventId: v.id("events"),
    platform: v.union(
      v.literal("twitter"),
      v.literal("facebook"),
      v.literal("instagram"),
      v.literal("linkedin")
    ),
    contentType: v.union(
      v.literal("announcement"),
      v.literal("countdown"),
      v.literal("behind_scenes"),
      v.literal("testimonial"),
      v.literal("early_bird")
    ),
  },
  handler: async (ctx, args) => {
    const event = await ctx.runQuery(api.events.getById, { eventId: args.eventId });
    if (!event) throw new Error("Event not found");

    const templates = getSocialTemplates(args.platform, args.contentType);
    const eventDate = new Date(event.eventDate);
    const daysUntil = Math.ceil((eventDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

    const variables = {
      eventName: event.name,
      eventDate: eventDate.toLocaleDateString(),
      location: event.location,
      daysUntil: daysUntil.toString(),
      price: event.price.toString(),
      organizerName: "EventPulse", // Could fetch from user data
    };

    const content = replaceVariables(templates.content, variables);
    const hashtags = templates.hashtags.join(" ");

    return {
      content: `${content}\n\n${hashtags}`,
      suggestedMedia: templates.suggestedMedia,
      bestTime: templates.bestTime,
    };
  },
});

// Affiliate/Referral System
export const createAffiliateCode = mutation({
  args: {
    eventId: v.optional(v.id("events")),
    affiliateUserId: v.string(),
    code: v.string(),
    commissionRate: v.number(), // percentage
    type: v.union(
      v.literal("affiliate"),
      v.literal("influencer"),
      v.literal("referral")
    ),
    validFrom: v.number(),
    validUntil: v.number(),
    maxUses: v.optional(v.number()),
    minPurchaseAmount: v.optional(v.number()),
    createdBy: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if code already exists
    const existing = await ctx.db
      .query("promoCodes")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .first();

    if (existing) {
      throw new Error("Affiliate code already exists");
    }

    const promoId = await ctx.db.insert("promoCodes", {
      code: args.code,
      eventId: args.eventId,
      createdBy: args.createdBy,
      type: args.type,
      affiliateUserId: args.affiliateUserId,
      commissionRate: args.commissionRate,
      maxUses: args.maxUses,
      minPurchaseAmount: args.minPurchaseAmount,
      discountType: "percentage",
      discountAmount: 0, // Affiliates don't give discounts, they earn commission
      validFrom: args.validFrom,
      validUntil: args.validUntil,
      currentUses: 0,
      isActive: true,
      createdAt: Date.now(),
    });

    return promoId;
  },
});

export const getAffiliateStats = query({
  args: {
    affiliateUserId: v.string(),
    eventId: v.optional(v.id("events")),
    dateRange: v.optional(v.object({
      start: v.number(),
      end: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("promoCodes")
      .withIndex("by_affiliate", (q) => q.eq("affiliateUserId", args.affiliateUserId));

    let codes = await query.collect();

    if (args.eventId) {
      codes = codes.filter(c => c.eventId === args.eventId);
    }

    // Calculate stats
    const totalCodes = codes.length;
    const activeCodes = codes.filter(c => c.isActive).length;
    const totalUses = codes.reduce((sum, c) => sum + c.currentUses, 0);
    const totalCommission = codes.reduce((sum, c) => {
      // This would need to be calculated from actual sales data
      return sum + (c.currentUses * (c.commissionRate || 0) * 10); // Placeholder calculation
    }, 0);

    return {
      totalCodes,
      activeCodes,
      totalUses,
      totalCommission,
      codes: codes.map(code => ({
        ...code,
        estimatedEarnings: code.currentUses * code.commissionRate * 10,
      })),
    };
  },
});

// Early Bird Pricing Automation
export const createEarlyBirdCampaign = mutation({
  args: {
    eventId: v.id("events"),
    name: v.string(),
    discountPercentage: v.number(),
    startDate: v.number(),
    endDate: v.number(),
    maxTickets: v.optional(v.number()),
    ticketTypeIds: v.optional(v.array(v.string())),
    createdBy: v.string(),
  },
  handler: async (ctx, args) => {
    const code = `EARLY_${Date.now().toString().slice(-6)}`;
    
    const promoId = await ctx.db.insert("promoCodes", {
      code,
      eventId: args.eventId,
      createdBy: args.createdBy,
      type: "early_bird",
      discountType: "percentage",
      discountAmount: args.discountPercentage,
      validFrom: args.startDate,
      validUntil: args.endDate,
      maxUses: args.maxTickets,
      currentUses: 0,
      isActive: true,
      createdAt: Date.now(),
    });

    return { promoId, code };
  },
});

export const getEarlyBirdCampaigns = query({
  args: {
    eventId: v.id("events"),
  },
  handler: async (ctx, { eventId }) => {
    const campaigns = await ctx.db
      .query("promoCodes")
      .withIndex("by_event", (q) => q.eq("eventId", eventId))
      .filter((q) => q.eq(q.field("type"), "early_bird"))
      .collect();

    const now = Date.now();
    
    return campaigns.map(campaign => ({
      ...campaign,
      status: now < campaign.validFrom ? "upcoming" :
              now > campaign.validUntil ? "expired" :
              campaign.currentUses >= (campaign.maxUses || Infinity) ? "sold_out" : "active",
      remainingTickets: (campaign.maxUses || Infinity) - campaign.currentUses,
      daysRemaining: Math.ceil((campaign.validUntil - now) / (1000 * 60 * 60 * 24)),
    }));
  },
});

// Advanced Promo Code Generation
export const generatePromoCode = action({
  args: {
    eventId: v.optional(v.id("events")),
    type: v.union(
      v.literal("percentage"),
      v.literal("fixed"),
      v.literal("bogo"),
      v.literal("group_discount")
    ),
    pattern: v.optional(v.string()), // e.g., "SAVE{XX}" where {XX} is random
    length: v.optional(v.number()),
    prefix: v.optional(v.string()),
    suffix: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const generateCode = (pattern?: string, length = 8, prefix = "", suffix = "") => {
      if (pattern) {
        return pattern.replace(/\{XX\}/g, () => 
          Math.random().toString(36).substring(2, 4).toUpperCase()
        );
      }
      
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
      let code = prefix;
      
      for (let i = 0; i < length; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      
      return code + suffix;
    };

    let attempts = 0;
    let code = "";
    
    // Ensure unique code
    while (attempts < 10) {
      code = generateCode(args.pattern, args.length, args.prefix, args.suffix);
      
      const existing = await ctx.runQuery(api.discounts.getDiscountByCode, { code });
      if (!existing) break;
      
      attempts++;
    }

    if (attempts >= 10) {
      throw new Error("Unable to generate unique promo code");
    }

    return {
      code,
      suggestions: {
        percentage: [10, 15, 20, 25, 30],
        fixed: [5, 10, 15, 20, 25],
        validityDays: [7, 14, 30, 60, 90],
      },
    };
  },
});

// Helper functions
function getSocialTemplates(platform: string, contentType: string) {
  const templates: Record<string, Record<string, any>> = {
    twitter: {
      announcement: {
        content: "🎉 Exciting news! {{eventName}} is happening on {{eventDate}} at {{location}}. Don't miss out!",
        hashtags: ["#{{eventName}}", "#Events", "#DontMiss"],
        suggestedMedia: ["event_banner", "venue_photo"],
        bestTime: "9:00 AM or 3:00 PM",
      },
      countdown: {
        content: "⏰ Only {{daysUntil}} days left until {{eventName}}! Have you got your tickets yet?",
        hashtags: ["#Countdown", "#{{eventName}}", "#LastChance"],
        suggestedMedia: ["countdown_graphic"],
        bestTime: "12:00 PM or 6:00 PM",
      },
      early_bird: {
        content: "🐦 Early bird special! Get your {{eventName}} tickets now for just ${{price}}. Limited time offer!",
        hashtags: ["#EarlyBird", "#{{eventName}}", "#LimitedOffer"],
        suggestedMedia: ["early_bird_graphic"],
        bestTime: "8:00 AM or 2:00 PM",
      },
    },
    facebook: {
      announcement: {
        content: "We're thrilled to announce {{eventName}} coming to {{location}} on {{eventDate}}! This is going to be an incredible experience you won't want to miss. Join us for an unforgettable event!",
        hashtags: ["#{{eventName}}", "#Events", "#Community"],
        suggestedMedia: ["event_banner", "behind_scenes_video"],
        bestTime: "1:00 PM or 7:00 PM",
      },
      countdown: {
        content: "The countdown is on! Just {{daysUntil}} days until {{eventName}}. We can't wait to see you there! Make sure you have your tickets ready.",
        hashtags: ["#Countdown", "#{{eventName}}", "#ExcitementBuilding"],
        suggestedMedia: ["countdown_video", "venue_tour"],
        bestTime: "3:00 PM or 8:00 PM",
      },
    },
    instagram: {
      announcement: {
        content: "✨ Something amazing is coming! {{eventName}} at {{location}} on {{eventDate}}. Swipe to see what's in store! 📸",
        hashtags: ["#{{eventName}}", "#Events", "#InstaEvent", "#DontMiss"],
        suggestedMedia: ["carousel_images", "story_highlights"],
        bestTime: "11:00 AM or 5:00 PM",
      },
      behind_scenes: {
        content: "Behind the scenes of {{eventName}} preparation! Can't wait to share this experience with you all 🎬",
        hashtags: ["#BehindTheScenes", "#{{eventName}}", "#EventPrep"],
        suggestedMedia: ["bts_photos", "preparation_video"],
        bestTime: "2:00 PM or 7:00 PM",
      },
    },
    linkedin: {
      announcement: {
        content: "We're excited to announce {{eventName}}, a professional networking and learning opportunity happening on {{eventDate}} at {{location}}. Join industry leaders and expand your network!",
        hashtags: ["#{{eventName}}", "#Networking", "#ProfessionalDevelopment"],
        suggestedMedia: ["professional_banner", "speaker_lineup"],
        bestTime: "9:00 AM or 12:00 PM",
      },
    },
  };

  return templates[platform]?.[contentType] || templates[platform]?.announcement || {
    content: "Check out {{eventName}} on {{eventDate}}!",
    hashtags: ["#{{eventName}}"],
    suggestedMedia: [],
    bestTime: "12:00 PM",
  };
}

function replaceVariables(content: string, variables: Record<string, string>): string {
  let result = content;
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, value);
  });
  return result;
}

// Social Media Analytics
export const getSocialMediaAnalytics = query({
  args: {
    eventId: v.id("events"),
    dateRange: v.optional(v.object({
      start: v.number(),
      end: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("socialPosts")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId));

    let posts = await query.collect();

    if (args.dateRange) {
      posts = posts.filter(p => 
        p.createdAt >= args.dateRange!.start && p.createdAt <= args.dateRange!.end
      );
    }

    const analytics = {
      totalPosts: posts.length,
      byPlatform: {} as Record<string, number>,
      byStatus: {} as Record<string, number>,
      totalEngagement: 0,
      averageEngagement: 0,
      topPerformingPosts: [] as any[],
    };

    posts.forEach(post => {
      analytics.byPlatform[post.platform] = (analytics.byPlatform[post.platform] || 0) + 1;
      analytics.byStatus[post.status] = (analytics.byStatus[post.status] || 0) + 1;
      
      if (post.engagement) {
        const totalEng = post.engagement.likes + post.engagement.shares + post.engagement.comments;
        analytics.totalEngagement += totalEng;
      }
    });

    analytics.averageEngagement = posts.length > 0 ? analytics.totalEngagement / posts.length : 0;
    
    analytics.topPerformingPosts = posts
      .filter(p => p.engagement)
      .sort((a, b) => {
        const aEng = a.engagement!.likes + a.engagement!.shares + a.engagement!.comments;
        const bEng = b.engagement!.likes + b.engagement!.shares + b.engagement!.comments;
        return bEng - aEng;
      })
      .slice(0, 5);

    return analytics;
  },
});

// Referral Tracking
export const trackReferral = mutation({
  args: {
    referralCode: v.string(),
    referredUserId: v.string(),
    eventId: v.optional(v.id("events")),
    conversionType: v.union(
      v.literal("signup"),
      v.literal("ticket_purchase"),
      v.literal("event_creation")
    ),
    conversionValue: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Find the referral code
    const promoCode = await ctx.db
      .query("promoCodes")
      .withIndex("by_code", (q) => q.eq("code", args.referralCode))
      .first();

    if (!promoCode || promoCode.type !== "referral") {
      throw new Error("Invalid referral code");
    }

    // Update usage count
    await ctx.db.patch(promoCode._id, {
      currentUses: promoCode.currentUses + 1,
    });

    // Record the referral (you might want to create a separate table for this)
    return {
      success: true,
      affiliateUserId: promoCode.affiliateUserId,
      commissionEarned: args.conversionValue ? 
        (args.conversionValue * (promoCode.commissionRate || 0) / 100) : 0,
    };
  },
}); 