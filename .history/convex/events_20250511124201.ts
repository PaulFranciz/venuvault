import { query, mutation } from "./_generated/server";
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
      })
    )),
  },
  handler: async (ctx, args) => {
    const { 
      name, description, location, eventDate, price, totalTickets, userId,
      locationTips, endDate, startTime, endTime, timezone, category,
      isPublished, inviteOnly, refundPolicy, ticketTypes
    } = args;
    
    const eventId = await ctx.db.insert("events", {
      name,
      description,
      location,
      eventDate,
      price,
      totalTickets,
      userId,
      // Include new fields if they're defined
      ...(locationTips !== undefined && { locationTips }),
      ...(endDate !== undefined && { endDate }),
      ...(startTime !== undefined && { startTime }),
      ...(endTime !== undefined && { endTime }),
      ...(timezone !== undefined && { timezone }),
      ...(category !== undefined && { category }),
      ...(isPublished !== undefined && { isPublished }),
      ...(inviteOnly !== undefined && { inviteOnly }),
      ...(refundPolicy !== undefined && { refundPolicy }),
      ...(ticketTypes !== undefined && { ticketTypes }),
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
    const tickets = await ctx.db
      .query("tickets")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const ticketsWithEvents = await Promise.all(
      tickets.map(async (ticket) => {
        const event = await ctx.db.get(ticket.eventId);
        return {
          ...ticket,
          event,
        };
      })
    );

    return ticketsWithEvents;
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
    const events = await ctx.db
      .query("events")
      .filter((q) => q.eq(q.field("is_cancelled"), undefined))
      .collect();

    return events.filter((event) => {
      const searchTermLower = searchTerm.toLowerCase();
      return (
        event.name.toLowerCase().includes(searchTermLower) ||
        event.description.toLowerCase().includes(searchTermLower) ||
        event.location.toLowerCase().includes(searchTermLower)
      );
    });
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
      })
    )),
  },
  handler: async (ctx, args) => {
    const { eventId, ...updates } = args;

    // Get current event to check tickets sold
    const event = await ctx.db.get(eventId);
    if (!event) throw new Error("Event not found");

    const soldTickets = await ctx.db
      .query("tickets")
      .withIndex("by_event", (q) => q.eq("eventId", eventId))
      .filter((q) =>
        q.or(q.eq(q.field("status"), "valid"), q.eq(q.field("status"), "used"))
      )
      .collect();

    // Ensure new total tickets is not less than sold tickets
    if (updates.totalTickets < soldTickets.length) {
      throw new Error(
        `Cannot reduce total tickets below ${soldTickets.length} (number of tickets already sold)`
      );
    }

    // For ticket types, ensure we're not reducing below sold count per type
    if (updates.ticketTypes) {
      // If we have ticket types in the updates
      const existingTickets = await ctx.db
        .query("tickets")
        .withIndex("by_event", (q) => q.eq("eventId", eventId))
        .filter((q) =>
          q.or(q.eq(q.field("status"), "valid"), q.eq(q.field("status"), "used"))
        )
        .collect();
      
      // Count sold tickets by ticket type
      const soldByType: Record<string, number> = {};
      existingTickets.forEach(ticket => {
        if (ticket.ticketTypeId) {
          soldByType[ticket.ticketTypeId] = (soldByType[ticket.ticketTypeId] || 0) + 1;
        }
      });
      
      // Check each type's quantity
      for (const type of updates.ticketTypes) {
        const soldForType = soldByType[type.id] || 0;
        if (type.quantity < soldForType) {
          throw new Error(
            `Cannot reduce "${type.name}" ticket type quantity below ${soldForType} (already sold)`
          );
        }
        
        // Update the remaining count based on sold tickets
        type.remaining = type.quantity - soldForType;
      }
    }

    await ctx.db.patch(eventId, updates);
    return eventId;
  },
});

// Mutation to cancel an event
export const cancelEvent = mutation({
  args: { eventId: v.id("events") },
  handler: async (ctx, { eventId }) => {
    // Simply mark the event as cancelled
    // Refund logic will be handled by a separate server action
    await ctx.db.patch(eventId, { is_cancelled: true });

    // Optionally: Update associated tickets to 'cancelled' status
    const tickets = await ctx.db
      .query("tickets")
      .withIndex("by_event", (q) => q.eq("eventId", eventId))
      .filter((q) => q.eq(q.field("status"), TICKET_STATUS.VALID))
      .collect();

    await Promise.all(
      tickets.map((ticket) =>
        ctx.db.patch(ticket._id, { status: TICKET_STATUS.CANCELLED })
      )
    );

    // Note: We don't process the waiting list here. 
    // Users on the waiting list for a cancelled event will simply not progress.
  },
});
