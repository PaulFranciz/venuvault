import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  events: defineTable({
    name: v.string(),
    description: v.string(),
    location: v.string(),
    locationTips: v.optional(v.string()),
    eventDate: v.number(), // For single events, this is the start date. For recurring, it's the first occurrence.
    endDate: v.optional(v.number()), // For single events, this is the end date. For recurring, it's the end date of the first occurrence if applicable.
    startTime: v.optional(v.string()),
    endTime: v.optional(v.string()),
    timezone: v.optional(v.string()),
    category: v.optional(v.string()),
    price: v.number(), // This might represent a base price or be deprecated if using ticketTypes exclusively
    totalTickets: v.number(), // This might represent total capacity or be deprecated
    userId: v.string(),
    imageStorageId: v.optional(v.id("_storage")),
    thumbnailImageStorageId: v.optional(v.id("_storage")), // For event card thumbnail
    is_cancelled: v.optional(v.boolean()),
    isPublished: v.optional(v.boolean()),
    inviteOnly: v.optional(v.boolean()),
    refundPolicy: v.optional(v.string()),
    organizerAbsorbsFees: v.optional(v.boolean()),
    isFreeEvent: v.optional(v.boolean()), 
    isHiddenFromHome: v.optional(v.boolean()), // Added field
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
  }),
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
  })
    .index("by_code", ["code"])
    .index("by_event", ["eventId"]),

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
  })
    .index("by_user_id", ["userId"])
    .index("by_email", ["email"]),
});
