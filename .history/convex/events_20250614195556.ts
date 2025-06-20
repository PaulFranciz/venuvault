import { query, mutation, internalMutation } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { DURATIONS, WAITING_LIST_STATUS, TICKET_STATUS } from "./constants";
import { api, components, internal } from "./_generated/api";
// import { processQueue } from "./waitingList";
import { MINUTE, RateLimiter } from "@convex-dev/rate-limiter";

export type Metrics = {
  soldTickets: number;
  refundedTickets: number;
  cancelledTickets: number;
  revenue: number;
};

// Initialize rate limiter
const rateLimiter = new RateLimiter(components.rateLimiter, {
  queueJoin: {
    kind: "fixed window",
    rate: 3, // 3 joins allowed
    period: 30 * MINUTE, // in 30 minutes
  },
});

export const get = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("events")
      .filter((q) => q.eq(q.field("is_cancelled"), undefined))
      .collect();
  },
});

export const getById = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, { eventId }) => {
    return await ctx.db.get(eventId);
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    location: v.string(),
    eventDate: v.number(), // Store as timestamp
    price: v.number(),
    totalTickets: v.number(),
    userId: v.string(),
    // New fields
    locationTips: v.optional(v.string()),
    endDate: v.optional(v.number()),
    startTime: v.optional(v.string()),
    endTime: v.optional(v.string()),
    timezone: v.optional(v.string()),
    category: v.optional(v.string()),
    isPublished: v.optional(v.boolean()),
    inviteOnly: v.optional(v.boolean()),
    refundPolicy: v.optional(v.string()),
    organizerAbsorbsFees: v.optional(v.boolean()),
    isFreeEvent: v.optional(v.boolean()), // Added isFreeEvent
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
    recurringInterval: v.optional(v.number()),
    recurringDaysOfWeek: v.optional(v.array(v.string())),
    recurringDayOfMonth: v.optional(v.number()),
    recurringEndDate: v.optional(v.number()), // Timestamp
    scheduledPublishTime: v.optional(v.number()), // Timestamp for scheduled publish
    imageStorageId: v.optional(v.id("_storage")), // For banner/main event image
    thumbnailImageStorageId: v.optional(v.id("_storage")) // For event card thumbnail
  },
  handler: async (ctx, args) => {
    const { 
      name, description, location, eventDate, price, totalTickets, userId,
      locationTips, endDate, startTime, endTime, timezone, category,
      isPublished, // This can now be explicitly set (e.g., to false for drafts)
      inviteOnly, refundPolicy, organizerAbsorbsFees, ticketTypes,
      isFreeEvent,
      // Destructure recurring event fields
      isRecurring, recurringFrequency, recurringInterval, recurringDaysOfWeek, 
      recurringDayOfMonth, recurringEndDate,
      scheduledPublishTime, // Destructure scheduledPublishTime
      imageStorageId, // Destructure imageStorageId
      thumbnailImageStorageId // Destructure thumbnailImageStorageId
    } = args;
    
    // Default isPublished to true if not provided, otherwise use the provided value.
    const finalIsPublished = isPublished === undefined ? true : isPublished;

    const eventId = await ctx.db.insert("events", {
      name,
      description,
      location,
      eventDate,
      price,
      totalTickets,
      userId,
      isPublished: finalIsPublished, // Use the determined isPublished state
      // Include new fields if they're defined
      ...(locationTips !== undefined && { locationTips }),
      ...(endDate !== undefined && { endDate }),
      ...(startTime !== undefined && { startTime }),
      ...(endTime !== undefined && { endTime }),
      ...(timezone !== undefined && { timezone }),
      ...(category !== undefined && { category }),
      // ...(isPublished !== undefined && { isPublished }), // Handled by finalIsPublished
      ...(inviteOnly !== undefined && { inviteOnly }),
      ...(refundPolicy !== undefined && { refundPolicy }),
      ...(organizerAbsorbsFees !== undefined && { organizerAbsorbsFees }),
      ...(isFreeEvent !== undefined && { isFreeEvent }), 
      ...(ticketTypes !== undefined && { ticketTypes }),
      // Include recurring event fields if they're defined
      ...(isRecurring !== undefined && { isRecurring }),
      ...(recurringFrequency !== undefined && { recurringFrequency }),
      ...(recurringInterval !== undefined && { recurringInterval }),
      ...(recurringDaysOfWeek !== undefined && { recurringDaysOfWeek }),
      ...(recurringDayOfMonth !== undefined && { recurringDayOfMonth }),
      ...(recurringEndDate !== undefined && { recurringEndDate }),
      ...(scheduledPublishTime !== undefined && { scheduledPublishTime }), // Add scheduledPublishTime
      ...(imageStorageId !== undefined && { imageStorageId }), // Add imageStorageId
      ...(thumbnailImageStorageId !== undefined && { thumbnailImageStorageId }) // Add thumbnailImageStorageId
    });
    return eventId;
  },
});

// Helper function to check ticket availability for an event
export const checkAvailability = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, { eventId }) => {
    const event = await ctx.db.get(eventId);
    if (!event) throw new Error("Event not found");

    // Count total purchased tickets
    const purchasedCount = await ctx.db
      .query("tickets")
      .withIndex("by_event", (q) => q.eq("eventId", eventId))
      .collect()
      .then(
        (tickets) =>
          tickets.filter(
            (t) =>
              t.status === TICKET_STATUS.VALID ||
              t.status === TICKET_STATUS.USED
          ).length
      );

    // Count current valid offers
    const now = Date.now();
    const activeOffers = await ctx.db
      .query("waitingList")
      .withIndex("by_event_status", (q) =>
        q.eq("eventId", eventId).eq("status", WAITING_LIST_STATUS.OFFERED)
      )
      .collect()
      .then(
        (entries) => entries.filter((e) => (e.offerExpiresAt ?? 0) > now).length
      );

    const availableSpots = event.totalTickets - (purchasedCount + activeOffers);

    return {
      available: availableSpots > 0,
      availableSpots,
      totalTickets: event.totalTickets,
      purchasedCount,
      activeOffers,
    };
  },
});

// Define return type for joinWaitingList handler
interface JoinWaitingListResult {
  success: boolean;
  status: typeof WAITING_LIST_STATUS.OFFERED | typeof WAITING_LIST_STATUS.WAITING;
  message: string;
}

// Join waiting list for an event
export const joinWaitingList = mutation({
  // Function takes an event ID and user ID as arguments
  args: { 
    eventId: v.id("events"), 
    userId: v.string(),
    ticketTypeId: v.optional(v.string()),
    quantity: v.optional(v.number())
  },
  handler: async (ctx, { eventId, userId, ticketTypeId, quantity = 1 }): Promise<JoinWaitingListResult> => {
    // Rate limit check
    const status = await rateLimiter.limit(ctx, "queueJoin", { key: userId });
    if (!status.ok) {
      throw new ConvexError(
        `You've joined the waiting list too many times. Please wait ${Math.ceil(
          status.retryAfter / (60 * 1000)
        )} minutes before trying again.`
      );
    }

    // First check if user already has an active entry in waiting list for this event
    // Active means any status except EXPIRED
    const existingEntry = await ctx.db
      .query("waitingList")
      .withIndex("by_user_event", (q) =>
        q.eq("userId", userId).eq("eventId", eventId)
      )
      .filter((q) => q.neq(q.field("status"), WAITING_LIST_STATUS.EXPIRED))
      .first();

    // Don't allow duplicate entries
    if (existingEntry) {
      throw new Error("Already in waiting list for this event");
    }

    // Verify the event exists
    const event = await ctx.db.get(eventId);
    if (!event) throw new Error("Event not found");

    // Check if there are any available tickets right now
    const { available } = await ctx.runQuery(api.events.checkAvailability, { eventId });

    const now = Date.now();

    if (available) {
      // If tickets are available, create an offer entry
      const waitingListId = await ctx.db.insert("waitingList", {
        eventId,
        userId,
        status: WAITING_LIST_STATUS.OFFERED, // Mark as offered
        offerExpiresAt: now + DURATIONS.TICKET_OFFER, // Set expiration time
        ticketTypeId,
        quantity
      });

      // Schedule a job to expire this offer after the offer duration
      await ctx.scheduler.runAfter(
        DURATIONS.TICKET_OFFER,
        internal.waitingList.expireOffer,
        {
          waitingListId,
          eventId,
        }
      );
    } else {
      // If no tickets available, add to waiting list
      await ctx.db.insert("waitingList", {
        eventId,
        userId,
        status: WAITING_LIST_STATUS.WAITING, // Mark as waiting
        ticketTypeId,
        quantity
      });
    }

    // Return appropriate status message
    return {
      success: true,
      status: available
        ? WAITING_LIST_STATUS.OFFERED // If available, status is offered
        : WAITING_LIST_STATUS.WAITING, // If not available, status is waiting
      message: available
        ? "Ticket offered - you have 15 minutes to purchase"
        : "Added to waiting list - you'll be notified when a ticket becomes available",
    };
  },
});

// Purchase ticket
export const purchaseTicket = mutation({
  args: {
    eventId: v.id("events"),
    userId: v.string(),
    waitingListId: v.id("waitingList"),
    paymentInfo: v.object({
      paystackReference: v.string(),
      amount: v.number(),
      currency: v.string(),
    }),
  },
  handler: async (ctx, { eventId, userId, waitingListId, paymentInfo }) => {
    console.log("Starting purchaseTicket handler", {
      eventId,
      userId,
      waitingListId,
    });

    // Verify waiting list entry exists and is valid
    const waitingListEntry = await ctx.db.get(waitingListId);
    console.log("Waiting list entry:", waitingListEntry);

    if (!waitingListEntry) {
      console.error("Waiting list entry not found");
      throw new Error("Waiting list entry not found");
    }

    if (waitingListEntry.status !== WAITING_LIST_STATUS.OFFERED) {
      console.error("Invalid waiting list status", {
        status: waitingListEntry.status,
      });
      throw new Error(
        "Invalid waiting list status - ticket offer may have expired"
      );
    }

    if (waitingListEntry.userId !== userId) {
      console.error("User ID mismatch", {
        waitingListUserId: waitingListEntry.userId,
        requestUserId: userId,
      });
      throw new Error("Waiting list entry does not belong to this user");
    }

    // Verify event exists and is active
    const event = await ctx.db.get(eventId);
    console.log("Event details:", event);

    if (!event) {
      console.error("Event not found", { eventId });
      throw new Error("Event not found");
    }

    if (event.is_cancelled) {
      console.error("Attempted purchase of cancelled event", { eventId });
      throw new Error("Event is no longer active");
    }

    // Get ticket quantity and type from waiting list entry
    const ticketTypeId = waitingListEntry.ticketTypeId;
    const quantity = waitingListEntry.quantity || 1;
    
    // If this is a typed ticket, update the remaining count
    if (ticketTypeId && event.ticketTypes) {
      const updatedTicketTypes = event.ticketTypes.map(type => {
        if (type.id === ticketTypeId) {
          // Reduce the remaining count
          return {
            ...type,
            remaining: Math.max(0, type.remaining - quantity),
            isSoldOut: type.remaining - quantity <= 0
          };
        }
        return type;
      });
      
      // Update the event with the new ticket type quantities
      await ctx.db.patch(eventId, {
        ticketTypes: updatedTicketTypes
      });
    }

    try {
      console.log("Creating ticket with payment info", paymentInfo);
      // Create tickets based on quantity (one record per ticket)
      for (let i = 0; i < quantity; i++) {
        await ctx.db.insert("tickets", {
          eventId,
          userId,
          purchasedAt: Date.now(),
          status: TICKET_STATUS.VALID,
          paystackReference: paymentInfo.paystackReference,
          amount: paymentInfo.amount / quantity, // Divide the amount per ticket
          currency: paymentInfo.currency,
          ticketTypeId, // Store the ticket type
        });
      }

      console.log("Updating waiting list status to purchased");
      await ctx.db.patch(waitingListId, {
        status: WAITING_LIST_STATUS.PURCHASED,
      });

      console.log("Processing queue for next person");
      // Process queue for next person
      await ctx.runMutation(api.waitingList.processQueue, { eventId });

      console.log("Purchase ticket completed successfully");
    } catch (error) {
      console.error("Failed to complete ticket purchase:", error);
      throw new Error(`Failed to complete ticket purchase: ${error}`);
    }
  },
});

// Get user's tickets with event information
export const getUserTickets = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    try {
      const tickets = await ctx.db
        .query("tickets")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();

      // Process tickets with better error handling
      const ticketsWithEvents = await Promise.all(
        tickets.map(async (ticket) => {
          try {
            const event = await ctx.db.get(ticket.eventId);
            return {
              ...ticket,
              event, // event might be null if deleted
            };
          } catch (error) {
            console.error(`Error fetching event ${ticket.eventId} for ticket ${ticket._id}:`, error);
            // Return ticket with null event if event fetch fails
            return {
              ...ticket,
              event: null,
            };
          }
        })
      );

      return ticketsWithEvents;
    } catch (error) {
      console.error("Error in getUserTickets:", error);
      return []; // Return empty array on error to prevent hanging
    }
  },
});

// Get user's waiting list entries with event information
export const getUserWaitingList = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const entries = await ctx.db
      .query("waitingList")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const entriesWithEvents = await Promise.all(
      entries.map(async (entry) => {
        const event = await ctx.db.get(entry.eventId);
        return {
          ...entry,
          event,
        };
      })
    );

    return entriesWithEvents;
  },
});

export const getEventAvailability = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, { eventId }) => {
    const event = await ctx.db.get(eventId);
    if (!event) throw new Error("Event not found");

    // Count total purchased tickets
    const purchasedCount = await ctx.db
      .query("tickets")
      .withIndex("by_event", (q) => q.eq("eventId", eventId))
      .collect()
      .then(
        (tickets) =>
          tickets.filter(
            (t) =>
              t.status === TICKET_STATUS.VALID ||
              t.status === TICKET_STATUS.USED
          ).length
      );

    // Count current valid offers
    const now = Date.now();
    const activeOffers = await ctx.db
      .query("waitingList")
      .withIndex("by_event_status", (q) =>
        q.eq("eventId", eventId).eq("status", WAITING_LIST_STATUS.OFFERED)
      )
      .collect()
      .then(
        (entries) => entries.filter((e) => (e.offerExpiresAt ?? 0) > now).length
      );

    const totalReserved = purchasedCount + activeOffers;

    return {
      isSoldOut: totalReserved >= event.totalTickets,
      totalTickets: event.totalTickets,
      purchasedCount,
      activeOffers,
      remainingTickets: Math.max(0, event.totalTickets - totalReserved),
    };
  },
});

export const search = query({
  args: { searchTerm: v.string() },
  handler: async (ctx, { searchTerm }) => {
    if (!searchTerm.trim()) return [];
    
    const events = await ctx.db
      .query("events")
      .filter((q) => q.eq(q.field("is_cancelled"), undefined))
      .collect();

    // Filter events based on search term
    return events
      .filter((event) => {
        const searchTermLower = searchTerm.toLowerCase();
        return (
          event.name.toLowerCase().includes(searchTermLower) ||
          event.description.toLowerCase().includes(searchTermLower) ||
          event.location.toLowerCase().includes(searchTermLower)
        );
      })
      .map(event => ({
        _id: event._id,
        name: event.name,
        location: event.location,
        eventDate: event.eventDate,
        // Return image information for thumbnails
        imageStorageId: event.imageStorageId,
        thumbnailImageStorageId: event.thumbnailImageStorageId
      }));
  },
});

// Check if user has published any events (used for role-based navigation)
export const hasUserPublishedEvents = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    // Handle case where userId is not provided or invalid
    if (!userId || typeof userId !== "string" || userId.trim() === "") {
      return false;
    }

    // Get any events by this user
    const userEvents = await ctx.db
      .query("events")
      .filter((q) => q.eq(q.field("userId"), userId))
      .collect();
    
    // No events at all means definitely not a creator
    if (!userEvents || userEvents.length === 0) {
      return false;
    }
    
    // Filter for published events
    const publishedEvents = userEvents.filter(event => {
      // Safely check optional fields
      return (
        (event && event.isPublished === true) || 
        (event && 
         event.isHiddenFromHome !== true && 
         event.is_cancelled !== true)
      );
    });
    
    // Return true if there's at least one published event
    return publishedEvents.length > 0;
  },
});

export const getSellerEvents = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const events = await ctx.db
      .query("events")
      .filter((q) => q.eq(q.field("userId"), userId))
      .collect();

    // For each event, get ticket sales data
    const eventsWithMetrics = await Promise.all(
      events.map(async (event) => {
        const tickets = await ctx.db
          .query("tickets")
          .withIndex("by_event", (q) => q.eq("eventId", event._id))
          .collect();

        const validTickets = tickets.filter(
          (t) => t.status === "valid" || t.status === "used"
        );
        const refundedTickets = tickets.filter((t) => t.status === "refunded");
        const cancelledTickets = tickets.filter(
          (t) => t.status === "cancelled"
        );

        const metrics: Metrics = {
          soldTickets: validTickets.length,
          refundedTickets: refundedTickets.length,
          cancelledTickets: cancelledTickets.length,
          revenue: validTickets.length * event.price,
        };

        return {
          ...event,
          metrics,
        };
      })
    );

    return eventsWithMetrics;
  },
});

export const updateEvent = mutation({
  args: {
    eventId: v.id("events"),
    name: v.string(),
    description: v.string(),
    location: v.string(),
    eventDate: v.number(),
    price: v.number(),
    totalTickets: v.number(),
    // New fields
    locationTips: v.optional(v.string()),
    endDate: v.optional(v.number()),
    startTime: v.optional(v.string()),
    endTime: v.optional(v.string()),
    timezone: v.optional(v.string()),
    category: v.optional(v.string()),
    isPublished: v.optional(v.boolean()),
    inviteOnly: v.optional(v.boolean()),
    refundPolicy: v.optional(v.string()),
    organizerAbsorbsFees: v.optional(v.boolean()),
    isFreeEvent: v.optional(v.boolean()), // Added isFreeEvent
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
    // SEO and Social Sharing
    seoTitle: v.optional(v.string()),
    seoDescription: v.optional(v.string()),
    socialShareImageId: v.optional(v.id("_storage")),
    // Media and Display related fields (already have imageStorageId)
    thumbnailImageStorageId: v.optional(v.id("_storage")) // Add thumbnailImageStorageId here too
  },
  handler: async (ctx, args) => {
    const { eventId, ...updateData } = args;

    // Ensure that fields like ticketTypes are handled correctly if they are part of updateData
    // For example, if ticketTypes is undefined in args, it shouldn't wipe out existing ticketTypes.
    // The spread operator for updateData should handle this correctly if convex partial updates work as expected.

    const existingEvent = await ctx.db.get(eventId);
    if (!existingEvent) {
      throw new ConvexError("Event not found.");
    }

    // Optional: Add authorization check here to ensure only the event owner can update it
    // const identity = await ctx.auth.getUserIdentity();
    // if (!identity || existingEvent.userId !== identity.subject) {
    //   throw new ConvexError("You are not authorized to update this event.");
    // }

    await ctx.db.patch(eventId, updateData);
    console.log(`Event ${eventId} updated successfully.`);
    return { success: true, eventId };
  },
});

// Mutation to cancel an event
export const cancelEvent = mutation({
  args: { eventId: v.id("events") },
  handler: async (ctx, { eventId }) => {
    const event = await ctx.db.get(eventId);
    if (!event) {
      throw new ConvexError("Event not found");
    }

    // Optionally, add logic to check if the user is authorized to cancel the event
    // For example, if (event.userId !== ctx.auth.userId) throw new ConvexError("Unauthorized");

    await ctx.db.patch(eventId, { is_cancelled: true, isPublished: false });

    // Optionally, notify users on the waiting list or ticket holders
    // This could involve another internal function call
    // await ctx.scheduler.runAfter(0, internal.notifications.notifyEventCancelled, { eventId });

    return { success: true, message: "Event cancelled successfully" };
  },
});

// Internal mutation for the cron job to publish scheduled events
export const publishScheduledEvents = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Find events that are not published and whose scheduled time has passed
    const eventsToPublish = await ctx.db
      .query("events")
      .filter((q) => 
        q.and(
          q.eq(q.field("isPublished"), false),
          q.lte(q.field("scheduledPublishTime"), now) // Ensure scheduledPublishTime is not null
        )
      )
      .collect();

    if (eventsToPublish.length === 0) {
      console.log("No events to publish at this time.");
      return { publishedCount: 0, message: "No events to publish." };
    }

    let publishedCount = 0;
    for (const event of eventsToPublish) {
      // Double check scheduledPublishTime, though the query should handle it.
      // This also handles cases where scheduledPublishTime might be null/undefined if schema allows
      if (event.scheduledPublishTime && event.scheduledPublishTime <= now) {
        await ctx.db.patch(event._id, { isPublished: true });
        publishedCount++;
      }
    }
    console.log(`Successfully published ${publishedCount} event(s).`);
    return { publishedCount, message: `Successfully published ${publishedCount} event(s).` };
  },
});
