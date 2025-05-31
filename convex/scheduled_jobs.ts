/**
 * This file contains Convex mutations for scheduled jobs.
 * Copy these functions into your tickets.ts file.
 */

import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id, Doc } from "./_generated/dataModel";
import { v } from "convex/values";

const OFFER_EXPIRATION_PERIOD = 24 * 60 * 60 * 1000;

/**
 * Cleanup expired ticket reservations in the waitingList table.
 * This mutation is meant to be called by a scheduled job.
 */
export const cleanupExpiredReservations = mutation({
  args: {},
  handler: async (ctx) => {
    // Find all waiting list entries that have expired
    const now = Date.now();
    // Using filter instead of withIndex to avoid schema errors
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
        
        // Get the parent event to update ticket type availability
        const event = await ctx.db.get(reservation.eventId);

        if (event && event.ticketTypes && reservation.ticketTypeId) {
          const ticketTypeIndex = event.ticketTypes.findIndex(tt => tt.id === reservation.ticketTypeId);
          if (ticketTypeIndex !== -1) {
            const updatedTicketTypes = [...event.ticketTypes];
            const ticketTypeToUpdate = updatedTicketTypes[ticketTypeIndex];
            
            ticketTypeToUpdate.remaining += (reservation.quantity ?? 1);
            if (ticketTypeToUpdate.remaining > ticketTypeToUpdate.quantity) {
              ticketTypeToUpdate.remaining = ticketTypeToUpdate.quantity; // Cap at max quantity
            }
            ticketTypeToUpdate.isSoldOut = ticketTypeToUpdate.remaining <= 0;

            await ctx.db.patch(event._id, {
              ticketTypes: updatedTicketTypes,
            });
          }
        }  
        results.ticketsReleased += (reservation.quantity || 1);
        
        results.processed++;
      } catch (err) {
        console.error(`Error processing expired reservation ${reservation._id}:`, err);
        results.errors++;
      }
    }
    
    return results;
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
    
    // Sort events by creation time to process oldest first
    eventsWithWaitlist.sort((a: Doc<"waitingList">, b: Doc<"waitingList">) => a._creationTime - b._creationTime);
    
    // Group waiting list entries by event and ticket type
    const waitlistByEventAndType = new Map<string, Doc<"waitingList">[]>();
    
    for (const entry of eventsWithWaitlist) {
      if (entry.ticketTypeId) { // Ensure ticketTypeId exists
        const key = `${entry.eventId}-${entry.ticketTypeId}`;
        if (!waitlistByEventAndType.has(key)) {
          waitlistByEventAndType.set(key, []);
        }
        waitlistByEventAndType.get(key)!.push(entry);
      }
    }
    

    
    for (const [_key, entries] of waitlistByEventAndType.entries()) {
      if (!entries || entries.length === 0) continue;
      const firstEntryInGroup = entries[0];
      const eventId = firstEntryInGroup.eventId;
      const currentTicketTypeId = firstEntryInGroup.ticketTypeId;

      if (!currentTicketTypeId) continue; // Should not happen due to earlier check
      
      try {
        // Get the parent event to update ticket type availability
        const event = await ctx.db.get(eventId);

        if (event && event.ticketTypes) {
          const ticketTypeIndex = event.ticketTypes.findIndex((tt: typeof event.ticketTypes[0]) => tt.id === currentTicketTypeId);
          if (ticketTypeIndex !== -1) {
            const ticketType = event.ticketTypes[ticketTypeIndex];
            
            if (ticketType.remaining > 0) {
              // Sort waiting list entries by creation time (first come, first served)
              entries.sort((a: Doc<"waitingList">, b: Doc<"waitingList">) => a._creationTime - b._creationTime);
              
              // Process waitlist entries up to available remaining quantity or maxEntries
              const entriesToProcessCount = Math.min(ticketType.remaining, entries.length, maxEntries);
              const entriesToProcess = entries.slice(0, entriesToProcessCount);
              
              if (entriesToProcess.length > 0) {
                const updatedTicketTypes = JSON.parse(JSON.stringify(event.ticketTypes)); // Deep copy
                const offeredTicketType = updatedTicketTypes[ticketTypeIndex];
                let numSuccessfullyOffered = 0;

                for (const waitlistEntry of entriesToProcess) {
                  if (!waitlistEntry.quantity || offeredTicketType.remaining < waitlistEntry.quantity) {
                    // Not enough remaining for this specific request, or quantity is undefined
                    continue;
                  }

                  // Offer the ticket to the user
                  await ctx.db.patch(waitlistEntry._id, {
                    status: "offered",
                    offerExpiresAt: Date.now() + OFFER_EXPIRATION_PERIOD,
                  });
                  
                  offeredTicketType.remaining -= waitlistEntry.quantity;
                  numSuccessfullyOffered++;
                  
                  results.notified++;
                  results.processed++;
                  
                  if (!results.eventIds.includes(eventId.toString())) { // eventId is Id<"events">, ensure it's string for array
                    results.eventIds.push(eventId.toString());
                  }
                }

                if (numSuccessfullyOffered > 0) {
                    offeredTicketType.isSoldOut = offeredTicketType.remaining <= 0;
                    await ctx.db.patch(event._id, {
                        ticketTypes: updatedTicketTypes,
                    });
                }
              }
            }
          }
        }
      } catch (err) {
        console.error(`Error processing waitlist for event ${eventId}, ticket type ${currentTicketTypeId}:`, err);
        results.errors++;
      }
    }
    
    return results;
  }
});
