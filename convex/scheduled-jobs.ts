/**
 * This file contains Convex mutations for scheduled jobs.
 * Copy these functions into your tickets.ts file.
 */

import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

/**
 * Cleanup expired ticket reservations in the waitingList table.
 * This mutation is meant to be called by a scheduled job.
 */
export const cleanupExpiredReservations = mutation({
  args: {},
  handler: async (ctx) => {
    // Find all waiting list entries that have expired
    const now = Date.now();
    const expiredReservations = await ctx.db
      .query("waitingList")
      .withIndex("by_status", (q) => q.eq("status", "reserved"))
      .filter((q) => q.lt(q.field("offerExpiresAt"), now))
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
          status: "expired",
          updatedAt: Date.now()
        });
        
        // Get the associated ticket type to update availability
        const ticketType = await ctx.db.get(reservation.ticketTypeId as Id<"ticketTypes">);
        
        if (ticketType) {
          // Increment available quantity
          await ctx.db.patch(ticketType._id, {
            quantity: (ticketType.quantity || 0) + (reservation.quantity || 1),
            updatedAt: Date.now()
          });
          
          results.ticketsReleased += (reservation.quantity || 1);
        }
        
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
      .withIndex("by_status", (q) => q.eq("status", "waiting"))
      .collect();
    
    // Group waiting list entries by event and ticket type
    const waitlistByEventAndType = new Map();
    
    for (const entry of eventsWithWaitlist) {
      const key = `${entry.eventId}-${entry.ticketTypeId}`;
      
      if (!waitlistByEventAndType.has(key)) {
        waitlistByEventAndType.set(key, []);
      }
      
      waitlistByEventAndType.get(key).push(entry);
    }
    
    // Process each event and ticket type combination
    for (const [key, entries] of waitlistByEventAndType.entries()) {
      const [eventId, ticketTypeId] = key.split('-');
      
      try {
        // Check current ticket availability
        const ticketType = await ctx.db.get(ticketTypeId as Id<"ticketTypes">);
        
        if (!ticketType || ticketType.quantity <= 0) {
          continue; // No tickets available
        }
        
        // Sort waiting list entries by creation time (first come, first served)
        entries.sort((a, b) => a._creationTime - b._creationTime);
        
        // Process waitlist entries up to available quantity or maxEntries
        const entriesToProcess = entries.slice(0, Math.min(ticketType.quantity, maxEntries));
        
        for (const entry of entriesToProcess) {
          // Mark the entry as notified
          await ctx.db.patch(entry._id, {
            status: "notified",
            notifiedAt: Date.now(),
            // Give them 24 hours to purchase
            offerExpiresAt: Date.now() + 24 * 60 * 60 * 1000,
            updatedAt: Date.now()
          });
          
          // Here you would trigger a notification to the user
          // This could be an email, SMS, or push notification
          // For now, we'll just count it
          
          results.notified++;
          results.processed++;
          
          if (!results.eventIds.includes(eventId)) {
            results.eventIds.push(eventId);
          }
        }
        
        // Update available quantity
        await ctx.db.patch(ticketType._id, {
          quantity: ticketType.quantity - entriesToProcess.length,
          updatedAt: Date.now()
        });
      } catch (err) {
        console.error(`Error processing waitlist for ${key}:`, err);
        results.errors++;
      }
    }
    
    return results;
  }
});
