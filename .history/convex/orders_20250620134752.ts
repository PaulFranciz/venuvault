import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { WAITING_LIST_STATUS, TICKET_STATUS } from "./constants";
import { nanoid } from "nanoid";

/**
 * Create an order for free tickets without requiring payment processing
 */
export const createFreeTicketOrder = mutation({
  args: {
    eventId: v.id("events"),
    waitingListId: v.id("waitingList"),
    tickets: v.array(
      v.object({
        ticketTypeId: v.string(),
        quantity: v.number(),
      })
    ),
    customerInfo: v.object({
      name: v.string(),
      email: v.string(),
      phone: v.optional(v.string()),
    }),
    recipients: v.optional(
      v.array(
        v.object({
          name: v.string(),
          email: v.string(),
        })
      )
    ),
  },
  handler: async (ctx, args) => {
    const { eventId, waitingListId, tickets, customerInfo, recipients } = args;

    // Get the event
    const event = await ctx.db.get(args.eventId);
    if (!event) {
      throw new Error("Event not found");
    }
    if (event.is_cancelled) {
      throw new Error("Event has been cancelled");
    }

    // Get waiting list entry
    const waitingListEntry = await ctx.db.get(waitingListId);
    if (!waitingListEntry) {
      throw new Error("Waiting list entry not found");
    }
    if (waitingListEntry.status !== WAITING_LIST_STATUS.OFFERED) {
      throw new Error("Ticket not available for purchase");
    }

    // Verify all tickets are free
    if (!event.ticketTypes || event.ticketTypes.length === 0) {
      throw new Error("No ticket types found for this event");
    }

    for (const { ticketTypeId, quantity } of tickets) {
      const ticketType = event.ticketTypes.find(t => t.id === ticketTypeId);
      if (!ticketType) {
        throw new Error(`Ticket type ${ticketTypeId} not found`);
      }
      if (ticketType.price > 0) {
        throw new Error("This function can only process free tickets");
      }
      if (ticketType.remaining < quantity) {
        throw new Error(`Only ${ticketType.remaining} tickets of type "${ticketType.name}" are available.`);
      }
    }

    // Generate a unique reference
    const reference = `FREE-${nanoid(8)}`;

    // Update ticket inventory
    const updatedTicketTypes = event.ticketTypes.map(tt => {
      const matchingTicket = tickets.find(t => t.ticketTypeId === tt.id);
      if (matchingTicket) {
        return {
          ...tt,
          remaining: tt.remaining - matchingTicket.quantity,
          // Note: tracking sales in the quantity difference instead of a 'sold' field
          quantity: tt.quantity
        };
      }
      return tt;
    });

    // Update the event with new ticket counts
    await ctx.db.patch(eventId, {
      ticketTypes: updatedTicketTypes
    });

    // Create tickets in the database
    const ticketIds = [];
    for (const { ticketTypeId, quantity } of tickets) {
      const ticketType = event.ticketTypes.find(t => t.id === ticketTypeId);
      
      // Handle recipients if provided
      const recipientsList = recipients || [];
      const mainRecipient = {
        name: customerInfo.name,
        email: customerInfo.email,
      };
      
      // Create tickets based on quantity
      for (let i = 0; i < quantity; i++) {
        // Use recipient if available, otherwise use main customer
        const recipient = recipientsList[i] || mainRecipient;
        
        const ticketId = await ctx.db.insert("tickets", {
          eventId,
          userId: waitingListEntry.userId,
          purchasedAt: Date.now(),
          status: TICKET_STATUS.VALID,
          ticketTypeId,
          // Store recipient info in the metadata field since it's not in the schema
          paystackReference: reference,
          amount: 0, // Free ticket
          currency: "NGN"
        });
        
        ticketIds.push(ticketId);
      }
    }

    // Update waiting list status to PURCHASED
    await ctx.db.patch(waitingListId, {
      status: WAITING_LIST_STATUS.PURCHASED
      // Note: purchasedAt doesn't exist in the schema for waitingList
    });

    // Update event attendeeCount
    const totalTicketsCreated = tickets.reduce((sum, ticket) => sum + ticket.quantity, 0);
    const currentAttendeeCount = event.attendeeCount || 0;
    await ctx.db.patch(eventId, {
      attendeeCount: currentAttendeeCount + totalTicketsCreated,
    });

    return {
      success: true,
      reference,
      ticketIds,
    };
  },
});

// Debug helper query
export const getOrdersByPaystackReference = query({
  args: { paystackReference: v.string() },
  handler: async (ctx, { paystackReference }) => {
    // This function checks for any orders with the specific reference
    // Since orders aren't stored in our current schema, we'll check tickets instead
    const tickets = await ctx.db
      .query("tickets")
      .filter((q) => q.eq(q.field("paystackReference"), paystackReference))
      .collect();
    
    // Convert tickets to order-like format for debugging
    return tickets.map(ticket => ({
      _id: ticket._id,
      _creationTime: ticket._creationTime,
      status: ticket.status,
      userId: ticket.userId,
      amount: ticket.amount || 0,
      paystackReference: ticket.paystackReference,
      eventId: ticket.eventId,
    }));
  },
});
