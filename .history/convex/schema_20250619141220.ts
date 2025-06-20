import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  events: defineTable({
    name: v.string(),
    description: v.string(),
    location: v.string(),
    locationTips: v.optional(v.string()),
    // Google Maps integration
    coordinates: v.optional(v.object({
      lat: v.number(),
      lng: v.number(),
    })),
    placeId: v.optional(v.string()),
    eventDate: v.number(), // For single events, this is the start date. For recurring, it's the first occurrence.
    endDate: v.optional(v.number()), // For single events, this is the end date. For recurring, it's the end date of the first occurrence if applicable.
    startTime: v.optional(v.string()),
    endTime: v.optional(v.string()),
    timezone: v.optional(v.string()),
    category: v.optional(v.string()),
    categoryId: v.optional(v.id("eventCategories")), // New structured category system
    tags: v.optional(v.array(v.string())), // Event tags for discovery
    price: v.number(), // This might represent a base price or be deprecated if using ticketTypes exclusively
    totalTickets: v.number(), // This might represent total capacity or be deprecated
    attendeeCount: v.optional(v.number()), // Track actual attendance for analytics
    userId: v.string(),
    createdAt: v.optional(v.number()), // Track creation time for trending/sorting
    imageStorageId: v.optional(v.id("_storage")),
    thumbnailImageStorageId: v.optional(v.id("_storage")), // For event card thumbnail
    is_cancelled: v.optional(v.boolean()),
    isPublished: v.optional(v.boolean()),
    inviteOnly: v.optional(v.boolean()),
    refundPolicy: v.optional(v.string()),
    organizerAbsorbsFees: v.optional(v.boolean()),
    isFreeEvent: v.optional(v.boolean()), 
    isHiddenFromHome: v.optional(v.boolean()), // Added field
    // Add fields for new media types
    audioSnippetUrl: v.optional(v.string()),
    videoSnippetUrl: v.optional(v.string()),
    generalImageUrls: v.optional(v.array(v.string())),
    ticketTypes: v.optional(v.array(
      v.object({
        id: v.string(),
        name: v.string(),
        description: v.optional(v.string()),
        price: v.number(),
        quantity: v.number(),
        remaining: v.number(),
        isSoldOut: v.optional(v.boolean()),
        isHidden: v.optional(v.boolean()),
        allowGroupPurchase: v.optional(v.boolean()),
        maxPerTransaction: v.optional(v.number()),
        minPerTransaction: v.optional(v.number()),
        priceInfo: v.optional(v.string()), // Added priceInfo
      })
    )),
    // Recurring Event Fields
    isRecurring: v.optional(v.boolean()),
    recurringFrequency: v.optional(v.union(
      v.literal('daily'),
      v.literal('weekly'),
      v.literal('monthly')
    )),
    recurringInterval: v.optional(v.number()), // e.g., every 2 weeks
    recurringDaysOfWeek: v.optional(v.array(v.string())), // e.g., ['Monday', 'Wednesday'] for weekly
    recurringDayOfMonth: v.optional(v.number()), // e.g., 15 for monthly on the 15th
    recurringEndDate: v.optional(v.number()), // Timestamp for when the recurrence ends
    scheduledPublishTime: v.optional(v.number()), // Timestamp for when the event should be published
    // Add storage IDs for new media types
    audioSnippetStorageId: v.optional(v.id("_storage")),
    videoSnippetStorageId: v.optional(v.id("_storage")),
    generalImageStorageIds: v.optional(v.array(v.id("_storage"))),
  }).index("by_userId", ["userId"]),
  tickets: defineTable({
    eventId: v.id("events"),
    userId: v.string(),
    purchasedAt: v.number(),
    status: v.union(
      v.literal("valid"),
      v.literal("used"),
      v.literal("refunded"),
      v.literal("cancelled")
    ),
    paystackReference: v.optional(v.string()),
    amount: v.optional(v.number()),
    currency: v.optional(v.string()),
    ticketTypeId: v.optional(v.string()),
  })
    .index("by_event", ["eventId"])
    .index("by_user", ["userId"])
    .index("by_user_event", ["userId", "eventId"])
    .index("by_paystack_reference", ["paystackReference"]),

  discountCodes: defineTable({
    code: v.string(),
    eventId: v.id("events"),
    createdBy: v.string(),
    discountType: v.union(v.literal("percentage"), v.literal("fixed")),
    discountAmount: v.number(),
    validFrom: v.number(),
    validUntil: v.number(),
    maxUses: v.optional(v.number()),
    currentUses: v.number(),
    ticketTypeIds: v.optional(v.array(v.string())),
    isActive: v.boolean(),
    // Affiliate/Referral System
    type: v.optional(v.union(
      v.literal("discount"),
      v.literal("affiliate"),
      v.literal("influencer"),
      v.literal("referral"),
      v.literal("early_bird")
    )),
    affiliateUserId: v.optional(v.string()),
    commissionRate: v.optional(v.number()), // percentage for affiliates
    minPurchaseAmount: v.optional(v.number()),
    createdAt: v.optional(v.number()),
  })
    .index("by_code", ["code"])
    .index("by_event", ["eventId"])
    .index("by_affiliate", ["affiliateUserId"])
    .index("by_type", ["type"]),

  waitingList: defineTable({
    eventId: v.id("events"),
    userId: v.string(),
    status: v.union(
      v.literal("waiting"),
      v.literal("offered"),
      v.literal("purchased"),
      v.literal("expired")
    ),
    offerExpiresAt: v.optional(v.number()),
    ticketTypeId: v.optional(v.string()),
    quantity: v.optional(v.number()),
  })
    .index("by_event_status", ["eventId", "status"])
    .index("by_user_event", ["userId", "eventId"])
    .index("by_user", ["userId"]),

  users: defineTable({
    name: v.string(),
    email: v.string(),
    userId: v.string(),
    paystackSubaccountId: v.optional(v.string()),
    logoStorageId: v.optional(v.id("_storage")),
    bannerStorageId: v.optional(v.id("_storage")),
    socialLinks: v.optional(v.object({
      instagram: v.optional(v.string()),
      twitter: v.optional(v.string()),
    })),
    onboardingComplete: v.optional(v.boolean()),
    // Email preferences
    emailPreferences: v.optional(v.object({
      marketing: v.boolean(),
      eventReminders: v.boolean(),
      eventUpdates: v.boolean(),
      networking: v.boolean(),
    })),
    // Networking profile
    networkingProfile: v.optional(v.object({
      bio: v.optional(v.string()),
      interests: v.optional(v.array(v.string())),
      company: v.optional(v.string()),
      jobTitle: v.optional(v.string()),
      linkedIn: v.optional(v.string()),
      twitter: v.optional(v.string()),
      website: v.optional(v.string()),
      isPublic: v.boolean(),
    })),
  })
    .index("by_user_id", ["userId"])
    .index("by_email", ["email"]),

  // Email Automation System
  emailSequences: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    eventId: v.optional(v.id("events")), // null for global sequences
    createdBy: v.string(),
    isActive: v.boolean(),
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
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_event", ["eventId"])
    .index("by_creator", ["createdBy"])
    .index("by_trigger", ["triggerType"]),

  emailTemplates: defineTable({
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
    isDefault: v.optional(v.boolean()),
    variables: v.optional(v.array(v.string())), // Available template variables
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_sequence", ["sequenceId"])
    .index("by_event", ["eventId"])
    .index("by_type", ["templateType"]),

  emailCampaigns: defineTable({
    name: v.string(),
    subject: v.string(),
    templateId: v.id("emailTemplates"),
    eventId: v.optional(v.id("events")),
    createdBy: v.string(),
    status: v.union(
      v.literal("draft"),
      v.literal("scheduled"),
      v.literal("sending"),
      v.literal("sent"),
      v.literal("cancelled")
    ),
    scheduledFor: v.optional(v.number()),
    sentAt: v.optional(v.number()),
    recipientCount: v.number(),
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
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_event", ["eventId"])
    .index("by_creator", ["createdBy"])
    .index("by_status", ["status"]),

  emailAnalytics: defineTable({
    campaignId: v.optional(v.id("emailCampaigns")),
    sequenceId: v.optional(v.id("emailSequences")),
    templateId: v.id("emailTemplates"),
    eventId: v.optional(v.id("events")),
    recipientEmail: v.string(),
    recipientUserId: v.optional(v.string()),
    emailId: v.string(), // Resend email ID
    status: v.union(
      v.literal("sent"),
      v.literal("delivered"),
      v.literal("opened"),
      v.literal("clicked"),
      v.literal("bounced"),
      v.literal("complained")
    ),
    sentAt: v.number(),
    deliveredAt: v.optional(v.number()),
    openedAt: v.optional(v.number()),
    clickedAt: v.optional(v.number()),
    clickedLinks: v.optional(v.array(v.string())),
    userAgent: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
    location: v.optional(v.object({
      country: v.optional(v.string()),
      city: v.optional(v.string()),
    })),
  })
    .index("by_campaign", ["campaignId"])
    .index("by_sequence", ["sequenceId"])
    .index("by_template", ["templateId"])
    .index("by_event", ["eventId"])
    .index("by_recipient", ["recipientEmail"])
    .index("by_status", ["status"]),

  // Event Communication & Updates
  eventAnnouncements: defineTable({
    eventId: v.id("events"),
    title: v.string(),
    content: v.string(),
    type: v.union(
      v.literal("general"),
      v.literal("schedule_change"),
      v.literal("venue_change"),
      v.literal("cancellation"),
      v.literal("important")
    ),
    createdBy: v.string(),
    isPublished: v.boolean(),
    sendEmail: v.boolean(),
    sendPush: v.optional(v.boolean()),
    targetAudience: v.union(
      v.literal("all_attendees"),
      v.literal("ticket_holders"),
      v.literal("waitlist")
    ),
    createdAt: v.number(),
    publishedAt: v.optional(v.number()),
  })
    .index("by_event", ["eventId"])
    .index("by_published", ["isPublished"]),

  eventQA: defineTable({
    eventId: v.id("events"),
    question: v.string(),
    answer: v.optional(v.string()),
    askedBy: v.string(), // userId
    answeredBy: v.optional(v.string()), // userId (organizer)
    isPublic: v.boolean(),
    isAnswered: v.boolean(),
    upvotes: v.number(),
    createdAt: v.number(),
    answeredAt: v.optional(v.number()),
  })
    .index("by_event", ["eventId"])
    .index("by_asker", ["askedBy"])
    .index("by_public", ["isPublic"]),

  // Attendee Networking
  networkingConnections: defineTable({
    eventId: v.id("events"),
    requesterUserId: v.string(),
    targetUserId: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("declined")
    ),
    message: v.optional(v.string()),
    createdAt: v.number(),
    respondedAt: v.optional(v.number()),
  })
    .index("by_event", ["eventId"])
    .index("by_requester", ["requesterUserId"])
    .index("by_target", ["targetUserId"])
    .index("by_status", ["status"]),

  meetingSchedules: defineTable({
    eventId: v.id("events"),
    organizerUserId: v.string(),
    attendeeUserId: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    scheduledTime: v.number(),
    duration: v.number(), // in minutes
    location: v.optional(v.string()), // physical location or virtual link
    status: v.union(
      v.literal("scheduled"),
      v.literal("confirmed"),
      v.literal("cancelled"),
      v.literal("completed")
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_event", ["eventId"])
    .index("by_organizer", ["organizerUserId"])
    .index("by_attendee", ["attendeeUserId"])
    .index("by_status", ["status"]),

  // Promo Codes & Affiliate System
  promoCodes: defineTable({
    code: v.string(),
    eventId: v.optional(v.id("events")), // null for global codes
    createdBy: v.string(),
    type: v.union(
      v.literal("early_bird"),
      v.literal("affiliate"),
      v.literal("influencer"),
      v.literal("bulk_discount"),
      v.literal("loyalty")
    ),
    discountType: v.union(v.literal("percentage"), v.literal("fixed")),
    discountAmount: v.number(),
    validFrom: v.number(),
    validUntil: v.number(),
    maxUses: v.optional(v.number()),
    currentUses: v.number(),
    minPurchaseAmount: v.optional(v.number()),
    affiliateUserId: v.optional(v.string()), // for affiliate codes
    commissionRate: v.optional(v.number()), // percentage for affiliates
    isActive: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_code", ["code"])
    .index("by_event", ["eventId"])
    .index("by_affiliate", ["affiliateUserId"])
    .index("by_type", ["type"]),

  // Social Media Integration
  socialPosts: defineTable({
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
    postedAt: v.optional(v.number()),
    status: v.union(
      v.literal("draft"),
      v.literal("scheduled"),
      v.literal("posted"),
      v.literal("failed")
    ),
    engagement: v.optional(v.object({
      likes: v.number(),
      shares: v.number(),
      comments: v.number(),
      clicks: v.number(),
    })),
    createdBy: v.string(),
    createdAt: v.number(),
  })
    .index("by_event", ["eventId"])
    .index("by_platform", ["platform"])
    .index("by_status", ["status"]),

  // Event Categories for Discovery
  eventCategories: defineTable({
    name: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
    icon: v.optional(v.string()),
    color: v.optional(v.string()),
    parentCategoryId: v.optional(v.id("eventCategories")),
    isActive: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_parent", ["parentCategoryId"])
    .index("by_active", ["isActive"]),
});
