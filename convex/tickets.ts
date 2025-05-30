import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { TICKET_STATUS } from "./constants"; // Assuming you have constants for ticket status

export const getUserTicketForEvent = query({
  args: {
    eventId: v.id("events"),
    userId: v.string(),
  },
  handler: async (ctx, { eventId, userId }) => {
    const ticket = await ctx.db
      .query("tickets")
      .withIndex("by_user_event", (q) =>
        q.eq("userId", userId).eq("eventId", eventId)
      )
      .first();

    return ticket;
  },
});

export const getTicketWithDetails = query({
  args: { ticketId: v.id("tickets") },
  handler: async (ctx, { ticketId }) => {
    const ticket = await ctx.db.get(ticketId);
    if (!ticket) return null;

    const event = await ctx.db.get(ticket.eventId);

    return {
      ...ticket,
      event,
    };
  },
});

export const getValidTicketsForEvent = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, { eventId }) => {
    return await ctx.db
      .query("tickets")
      .withIndex("by_event", (q) => q.eq("eventId", eventId))
      .filter((q) =>
        q.or(q.eq(q.field("status"), "valid"), q.eq(q.field("status"), "used"))
      )
      .collect();
  },
});

export const updateTicketStatus = mutation({
  args: {
    ticketId: v.id("tickets"),
    status: v.union(
      v.literal("valid"),
      v.literal("used"),
      v.literal("refunded"),
      v.literal("cancelled")
    ),
  },
  handler: async (ctx, { ticketId, status }) => {
    await ctx.db.patch(ticketId, { status });
  },
});

export const getTicketDetailsForValidation = query({
  args: { ticketId: v.id("tickets") },
  handler: async (ctx, args) => {
    console.log(`[CONVEX Q(tickets:getTicketDetailsForValidation)] Fetching details for ticket: ${args.ticketId}`);

    // Fetch the ticket document
    const ticket = await ctx.db.get(args.ticketId);

    if (!ticket) {
      console.log(`[CONVEX Q(tickets:getTicketDetailsForValidation)] Ticket not found: ${args.ticketId}`);
      return null; // Ticket doesn't exist
    }

    // Fetch the associated event document
    const event = await ctx.db.get(ticket.eventId);
    if (!event) {
        // This shouldn't happen if data integrity is maintained, but handle it
        console.error(`[CONVEX Q(tickets:getTicketDetailsForValidation)] Event ${ticket.eventId} not found for ticket ${args.ticketId}`);
        // Decide how to handle - return null or partial data?
        // Returning null might be safer to avoid showing invalid state.
        return null;
    }

    // Fetch the associated user document (attendee)
    const user = await ctx.db.query("users")
                           .filter(q => q.eq(q.field("userId"), ticket.userId))
                           .first(); // Assuming userId field from Clerk is stored

     if (!user) {
        console.error(`[CONVEX Q(tickets:getTicketDetailsForValidation)] User ${ticket.userId} not found for ticket ${args.ticketId}`);
        // Return null or partial data?
        return null;
    }

    console.log(`[CONVEX Q(tickets:getTicketDetailsForValidation)] Found ticket, event, and user for: ${args.ticketId}`);
    return {
      ticket: {
          _id: ticket._id,
          status: ticket.status, // Ensure you have a 'status' field ('valid', 'used', etc.)
          createdAt: ticket._creationTime,
          // Add other relevant ticket fields if needed
      },
      event: {
          _id: event._id,
          name: event.name,
          eventDate: event.eventDate,
          location: event.location,
          is_cancelled: event.is_cancelled,
      },
      user: {
          name: user.name, // Assuming user doc has a 'name' field
          email: user.email, // Assuming user doc has an 'email' field
      }
    };
  },
});

// --- Function to generate QR code data (example - implement where needed) ---
// Needs baseUrl from your environment/config
// export function generateTicketValidationUrl(ticketId: Id<"tickets">, baseUrl: string): string {
//   return `${baseUrl}/validate-ticket/${ticketId}`;
// }

// Make sure confirmPayment mutation is properly closed

// Ticket reservation mutation for the high-performance system
export const reserveTicket = mutation({
  args: {
    eventId: v.id("events"),
    userId: v.string(),
    ticketTypeId: v.string(),
    quantity: v.number(),
  },
  handler: async (ctx, { eventId, userId, ticketTypeId, quantity }) => {
    // Get the event to check availability
    const event = await ctx.db.get(eventId);
    if (!event) {
      throw new Error("Event not found");
    }

    // Check if the event is not cancelled
    if (event.is_cancelled) {
      throw new Error("Event is cancelled");
    }

    // Find the ticket type
    const ticketType = event.ticketTypes?.find(t => t.id === ticketTypeId);
    if (!ticketType) {
      throw new Error("Ticket type not found");
    }

    // Check availability
    if (ticketType.quantity !== undefined && ticketType.quantity < quantity) {
      throw new Error("Not enough tickets available");
    }

    // Create a waiting list entry with status "offered"
    const waitingListId = await ctx.db.insert("waitingList", {
      eventId,
      userId,
      ticketTypeId,
      quantity,
      status: "offered",
      offerExpiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes expiry
    });

    return {
      success: true,
      waitingListId,
    };
  },
});

// Payment confirmation mutation for the high-performance system
export const confirmPayment = mutation({
  args: {
    reservationId: v.id("waitingList"),
    paymentMethod: v.string(),
    paystackReference: v.optional(v.string()),
  },
  handler: async (ctx, { reservationId, paymentMethod, paystackReference }) => {
    // Get the reservation
    const reservation = await ctx.db.get(reservationId);
    if (!reservation) {
      throw new Error("Reservation not found");
    }

    // Check if the reservation is still valid
    if (reservation.status !== "offered" || 
        (reservation.offerExpiresAt && Date.now() > reservation.offerExpiresAt)) {
      throw new Error("Reservation has expired");
    }

    // Get the event
    const event = await ctx.db.get(reservation.eventId);
    if (!event) {
      throw new Error("Event not found");
    }

    // Find the ticket type
    const ticketType = event.ticketTypes?.find(t => t.id === reservation.ticketTypeId);
    if (!ticketType) {
      throw new Error("Ticket type not found");
    }

    // Create the ticket with proper fields according to the schema
    const ticketId = await ctx.db.insert("tickets", {
      eventId: reservation.eventId,
      userId: reservation.userId,
      ticketTypeId: reservation.ticketTypeId || "",
      status: "valid",
      purchasedAt: Date.now(),
      amount: ticketType.price * (reservation.quantity || 1),
      currency: "NGN",
      paystackReference
      // Note: paymentMethod is not in the schema so we omit it
    });

    // Update the reservation status
    await ctx.db.patch(reservationId, {
      status: "purchased", // Use a valid status from the enum
    });

    // Update ticket type quantity if it's defined
    if (ticketType.quantity !== undefined && event.ticketTypes) {
      // We can't directly update the ticketTypes array in the event document
      // So we need to get all ticket types, update the specific one, and then update the whole array
      const updatedTicketTypes = event.ticketTypes.map(t => {
        if (t.id === reservation.ticketTypeId && t.quantity !== undefined) {
          return { ...t, quantity: t.quantity - (reservation.quantity || 1) };
        }
        return t;
      });

      await ctx.db.patch(reservation.eventId, {
        ticketTypes: updatedTicketTypes,
      });
    }

    return {
      success: true,
      ticketId,
    };
  },
})
