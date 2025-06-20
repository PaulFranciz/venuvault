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
    const tickets = await ctx.db
      .query("tickets")
      .withIndex("by_user_event", (q) =>
        q.eq("userId", userId).eq("eventId", eventId)
      )
      .collect();

    // Filter out test tickets and only return valid purchased tickets
    const validTickets = tickets.filter(ticket => {
      // Exclude test tickets
      if (!ticket.paystackReference || 
          ticket.paystackReference === 'test' ||
          ticket.paystackReference.includes('test_ref_') ||
          ticket.paystackReference.includes('test_protection_check')) {
        return false;
      }
      
      // Only return valid or used tickets
      return ticket.status === 'valid' || ticket.status === 'used';
    });

    // Return the first valid ticket (users should only have one ticket per event)
    return validTickets.length > 0 ? validTickets[0] : null;
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

    // Update event attendeeCount
    const currentAttendeeCount = event.attendeeCount || 0;
    await ctx.db.patch(reservation.eventId, {
      attendeeCount: currentAttendeeCount + (reservation.quantity || 1),
    });

    return {
      success: true,
      ticketId,
    };
  },
})

/**
 * Cleanup expired ticket reservations in the waitingList table.
 * This mutation is meant to be called by a scheduled job.
 */
export const cleanupExpiredReservations = mutation({
  args: {},
  handler: async (ctx) => {
    try {
      // Find all waiting list entries that have expired
      const now = Date.now();
      
      // Query for reserved waiting list entries that have expired
      const expiredReservations = await ctx.db
        .query("waitingList")
        .filter((q) => 
          q.eq(q.field("status"), "reserved") && 
          q.lt(q.field("offerExpiresAt"), now)
        )
        .collect();
      
      console.log(`Found ${expiredReservations.length} expired reservations to clean up`);
      
      const results = {
        processed: 0,
        errors: 0,
        ticketsReleased: 0
      };
      
      // Process each expired reservation
      for (const reservation of expiredReservations) {
        try {
          // Mark as expired in the waiting list
          await ctx.db.patch(reservation._id, {
            status: "expired"
          });
          
          // Get the associated ticket type to update availability
          if (reservation.ticketTypeId) {
            try {
              // Using any type to avoid schema errors
              const ticketType: any = await ctx.db.get(reservation.ticketTypeId as any);
              
              if (ticketType && typeof ticketType.quantity === 'number') {
                // Increment available quantity
                await ctx.db.patch(ticketType._id, {
                  quantity: ticketType.quantity + (reservation.quantity || 1)
                });
                
                results.ticketsReleased += (reservation.quantity || 1);
              }
            } catch (ticketTypeError) {
              // Log but don't fail the entire operation for invalid ticket type IDs
              console.warn(`Invalid ticket type ID ${reservation.ticketTypeId} for reservation ${reservation._id}:`, ticketTypeError);
            }
          }
          
          results.processed++;
        } catch (err) {
          console.error(`Error processing expired reservation ${reservation._id}:`, err);
          results.errors++;
        }
      }
      
      return results;
    } catch (error) {
      console.error('Error in cleanupExpiredReservations:', error);
      return {
        processed: 0,
        errors: 1,
        ticketsReleased: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
});

/**
 * Process waitlist entries for events with available tickets.
 * This mutation is meant to be called by a scheduled job.
 */
export const processWaitlist = mutation({
  args: {
    maxEntries: v.optional(v.number())
  },
  handler: async (ctx, { maxEntries = 50 }) => {
    try {
      const results = {
        processed: 0,
        notified: 0,
        errors: 0,
        eventIds: [] as string[]
      };
      
      // Find all events with a waitlist
      const eventsWithWaitlist = await ctx.db
        .query("waitingList")
        .filter((q) => q.eq(q.field("status"), "waiting"))
        .collect();
      
      console.log(`Found ${eventsWithWaitlist.length} waitlist entries to process`);
      
      // Group waiting list entries by event and ticket type
      const waitlistByEventAndType = new Map<string, any[]>();
      
      for (const entry of eventsWithWaitlist) {
        // Make sure both IDs exist before using them
        if (entry.eventId && entry.ticketTypeId) {
          const key = `${entry.eventId}-${entry.ticketTypeId}`;
          
          if (!waitlistByEventAndType.has(key)) {
            waitlistByEventAndType.set(key, []);
          }
          
          waitlistByEventAndType.get(key)?.push(entry);
        }
      }
      
      // Process each event and ticket type combination
      for (const [key, entries] of waitlistByEventAndType.entries()) {
        const [eventIdStr, ticketTypeIdStr] = key.split('-');
        
        try {
          // Skip if we don't have a valid ticket type ID
          if (!ticketTypeIdStr) continue;
          
          // Get the ticket type document - using any type to avoid schema errors
          // In a real implementation, you would use the proper type definition
          const ticketType: any = await ctx.db.get(ticketTypeIdStr as any);
          
          // Skip if ticket type doesn't exist or has no available tickets
          if (!ticketType || typeof ticketType.quantity !== 'number' || ticketType.quantity <= 0) {
            continue;
          }
          
          // Sort waiting list entries by creation time (first come, first served)
          const sortedEntries = [...entries].sort((a, b) => 
            (a._creationTime || 0) - (b._creationTime || 0)
          );
          
          // Process waitlist entries up to available quantity or maxEntries
          const entriesToProcess = sortedEntries.slice(0, Math.min(ticketType.quantity, maxEntries));
          
          for (const entry of entriesToProcess) {
            try {
              // Mark the entry as offered
              await ctx.db.patch(entry._id, {
                status: "offered",
                // Set expiration 24 hours from now
                offerExpiresAt: Date.now() + 24 * 60 * 60 * 1000
              });
              
              // Here you would trigger a notification to the user through a separate system
              
              results.notified++;
              results.processed++;
              
              if (eventIdStr && !results.eventIds.includes(eventIdStr)) {
                results.eventIds.push(eventIdStr);
              }
            } catch (patchError) {
              console.error(`Error updating waitlist entry ${entry._id}:`, patchError);
              results.errors++;
            }
          }
          
          // Update available quantity
          if (entriesToProcess.length > 0) {
            try {
              await ctx.db.patch(ticketType._id, {
                quantity: ticketType.quantity - entriesToProcess.length
              });
            } catch (updateError) {
              console.error(`Error updating ticket type quantity for ${ticketTypeIdStr}:`, updateError);
              results.errors++;
            }
          }
        } catch (err) {
          console.error(`Error processing waitlist for ${key}:`, err);
          results.errors++;
        }
      }
      
      return results;
    } catch (error) {
      console.error('Error in processWaitlist:', error);
      return {
        processed: 0,
        notified: 0,
        errors: 1,
        eventIds: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
});

// Get all tickets for a specific event (for organizers)
export const getEventTickets = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, { eventId }) => {
    // First verify the event exists
    const event = await ctx.db.get(eventId);
    if (!event) {
      throw new Error("Event not found");
    }

    // Get all tickets for this event
    const tickets = await ctx.db
      .query("tickets")
      .withIndex("by_event", (q) => q.eq("eventId", eventId))
      .collect();

    // Enhance tickets with user information
    const ticketsWithUserInfo = await Promise.all(
      tickets.map(async (ticket) => {
        // Get user info from the users table
        const user = await ctx.db
          .query("users")
          .filter((q) => q.eq(q.field("userId"), ticket.userId))
          .first();

        // Get ticket type name from event's ticketTypes array
        const ticketType = event.ticketTypes?.find(t => t.id === ticket.ticketTypeId);

        return {
          ...ticket,
          userName: user?.name || ticket.userId,
          userEmail: user?.email || 'No email',
          ticketType: ticketType?.name || 'General'
        };
      })
    );

    return ticketsWithUserInfo;
  },
});

// Test mutation for creating tickets manually (DISABLED IN PRODUCTION)
export const createTestTicket = mutation({
  args: {
    eventId: v.id("events"),
    userId: v.string(),
    ticketTypeId: v.string(),
    status: v.string(),
    amount: v.number(),
    currency: v.string(),
    paystackReference: v.string(),
  },
  handler: async (ctx, args) => {
    // SECURITY: Always disable test ticket creation (safer approach)
    throw new Error("Test ticket creation is disabled for security reasons");
  },
});

// Cleanup mutation to remove test tickets (ADMIN USE ONLY)
export const cleanupTestTickets = mutation({
  args: {},
  handler: async (ctx) => {
    console.log("Starting test ticket cleanup...");
    
    // Get all tickets
    const allTickets = await ctx.db.query("tickets").collect();
    
    // Find test tickets
    const testTickets = allTickets.filter(ticket => 
      !ticket.paystackReference || 
      ticket.paystackReference === 'test' ||
      ticket.paystackReference.includes('test_ref_') ||
      ticket.paystackReference.includes('test_protection_check') ||
      ticket.paystackReference.includes('FREE-')
    );
    
    console.log(`Found ${testTickets.length} test tickets to delete`);
    
    // Delete test tickets
    let deletedCount = 0;
    for (const ticket of testTickets) {
      try {
        await ctx.db.delete(ticket._id);
        console.log(`Deleted test ticket: ${ticket._id} (User: ${ticket.userId}, Ref: ${ticket.paystackReference})`);
        deletedCount++;
      } catch (error) {
        console.error(`Failed to delete ticket ${ticket._id}:`, error);
      }
    }
    
    console.log(`Cleanup completed. Deleted ${deletedCount} test tickets.`);
    return { deletedCount, totalFound: testTickets.length };
  },
});

// PHASE 2 OPTIMIZATION: High-performance getUserTickets with parallel execution
export const getUserTicketsOptimized = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const startTime = Date.now();
    
    try {
      // Step 1: Get all user tickets in parallel with event IDs collection
      const [tickets, allEventIds] = await Promise.all([
        // Get user tickets
        ctx.db
          .query("tickets")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .collect(),
        
        // Pre-fetch unique event IDs for batch processing
        ctx.db
          .query("tickets")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .collect()
          .then(tickets => [...new Set(tickets.map(t => t.eventId))])
      ]);

      if (!tickets || tickets.length === 0) {
        console.log(`[OPTIMIZED] getUserTickets: No tickets found for user ${userId} (${Date.now() - startTime}ms)`);
        return [];
      }

      // Step 2: Batch fetch all events in parallel (instead of sequential)
      const eventIds = [...new Set(tickets.map(t => t.eventId))];
      const eventPromises = eventIds.map(eventId => 
        ctx.db.get(eventId).catch(error => {
          console.error(`[OPTIMIZED] Error fetching event ${eventId}:`, error);
          return null; // Return null for failed event fetches
        })
      );

      const events = await Promise.all(eventPromises);
      
      // Step 3: Create event lookup map for O(1) access
      const eventMap = new Map();
      eventIds.forEach((eventId, index) => {
        eventMap.set(eventId, events[index]);
      });

      // Step 4: Combine tickets with events using map lookup (fastest)
      const ticketsWithEvents = tickets.map(ticket => ({
        ...ticket,
        event: eventMap.get(ticket.eventId) || null
      }));

      const duration = Date.now() - startTime;
      console.log(`[OPTIMIZED] getUserTickets: Processed ${tickets.length} tickets, ${eventIds.length} unique events in ${duration}ms`);

      return ticketsWithEvents;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[OPTIMIZED] Error in getUserTickets (${duration}ms):`, error);
      return []; // Return empty array on error to prevent hanging
    }
  },
});

// PHASE 2 OPTIMIZATION: Fast single ticket lookup with event details
export const getUserTicketForEventOptimized = query({
  args: {
    eventId: v.id("events"),
    userId: v.string(),
  },
  handler: async (ctx, { eventId, userId }) => {
    const startTime = Date.now();
    
    try {
      // Parallel fetch tickets and event data
      const [tickets, event] = await Promise.all([
        ctx.db
          .query("tickets")
          .withIndex("by_user_event", (q) =>
            q.eq("userId", userId).eq("eventId", eventId)
          )
          .collect(),
        ctx.db.get(eventId)
      ]);

      // Filter out test tickets and only return valid purchased tickets
      const validTickets = tickets.filter(ticket => {
        // Exclude test tickets
        if (!ticket.paystackReference || 
            ticket.paystackReference === 'test' ||
            ticket.paystackReference.includes('test_ref_')) {
          return false;
        }
        
        // Only return valid or used tickets
        return ticket.status === 'valid' || ticket.status === 'used';
      });

      const duration = Date.now() - startTime;
      
      if (validTickets.length === 0) {
        console.log(`[OPTIMIZED] getUserTicketForEventOptimized: No valid ticket found for user ${userId}, event ${eventId} (${duration}ms)`);
        return null;
      }

      console.log(`[OPTIMIZED] getUserTicketForEventOptimized: Found valid ticket in ${duration}ms`);
      
      return {
        ...validTickets[0], // Return first valid ticket
        event
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[OPTIMIZED] Error in getUserTicketForEventOptimized (${duration}ms):`, error);
      return null;
    }
  },
});

// PHASE 2 OPTIMIZATION: Batch ticket processing for multiple users
export const getUserTicketsBatch = query({
  args: { userIds: v.array(v.string()) },
  handler: async (ctx, { userIds }) => {
    const startTime = Date.now();
    
    try {
      if (!userIds || userIds.length === 0) return {};

      // Step 1: Get all tickets for all users in one query
      const allTickets = await ctx.db
        .query("tickets")
        .filter((q) => 
          q.or(...userIds.map(userId => q.eq(q.field("userId"), userId)))
        )
        .collect();

      // Step 2: Get unique event IDs and batch fetch events
      const eventIds = [...new Set(allTickets.map(t => t.eventId))];
      const events = await Promise.all(
        eventIds.map(eventId => 
          ctx.db.get(eventId).catch(() => null)
        )
      );

      // Step 3: Create lookup maps
      const eventMap = new Map();
      eventIds.forEach((eventId, index) => {
        eventMap.set(eventId, events[index]);
      });

      // Step 4: Group tickets by user and attach events
      const userTicketsMap: Record<string, any[]> = {};
      userIds.forEach(userId => {
        userTicketsMap[userId] = [];
      });

      allTickets.forEach(ticket => {
        if (userTicketsMap[ticket.userId]) {
          userTicketsMap[ticket.userId].push({
            ...ticket,
            event: eventMap.get(ticket.eventId) || null
          });
        }
      });

      const duration = Date.now() - startTime;
      console.log(`[OPTIMIZED] getUserTicketsBatch: Processed ${allTickets.length} tickets for ${userIds.length} users in ${duration}ms`);

      return userTicketsMap;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[OPTIMIZED] Error in getUserTicketsBatch (${duration}ms):`, error);
      return {};
    }
  },
});

// Optimized functions are now available as separate exports
// Use getUserTicketForEventOptimized for better performance


