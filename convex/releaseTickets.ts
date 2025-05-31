import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

/**
 * Release a ticket reservation after a user decides not to purchase it.
 * This frees up the ticket for other users and clears the reservation.
 */
export const releaseTicket = mutation({
  args: {
    reservationId: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, { reservationId, userId }) => {
    try {
      console.log(`[CONVEX M(releaseTickets:releaseTicket)] Releasing reservation ${reservationId} for user ${userId}`);
      
      // Find the reservation
      const reservation = await ctx.db
        .query("waitingList")
        .filter(q => 
          q.and(
            q.eq(q.field("_id"), reservationId as any),
            q.eq(q.field("userId"), userId)
          )
        )
        .first();
      
      if (!reservation) {
        console.log(`[CONVEX M(releaseTickets:releaseTicket)] No reservation found with ID ${reservationId}`);
        return { success: false, message: "Reservation not found" };
      }
      
      // Check if this is an offered reservation that can be released
      // In our schema we'll consider 'offered' tickets as the ones to release
      if (reservation.status !== "offered") {
        console.log(`[CONVEX M(releaseTickets:releaseTicket)] Reservation ${reservationId} has status ${reservation.status}, cannot release`);
        return { success: false, message: `Reservation is ${reservation.status}, not releasable` };
      }
      
      // Mark the reservation as expired (this is the closest status to "released")
      await ctx.db.patch(reservation._id, {
        status: "expired",
        offerExpiresAt: Date.now() // Update expiry time to now to show it's been manually expired/released
      });
      
      // Update the ticket availability in the event
      if (reservation.eventId && reservation.ticketTypeId) {
        // Find the event to get the ticket types
        const event = await ctx.db.get(reservation.eventId);
        
        if (event && event.ticketTypes) {
          // Find the specific ticket type and increment its available quantity
          const ticketTypeIndex = event.ticketTypes.findIndex(t => t.id === reservation.ticketTypeId);
          
          if (ticketTypeIndex >= 0) {
            const ticketType = event.ticketTypes[ticketTypeIndex];
            const newRemaining = (ticketType.remaining || 0) + (reservation.quantity || 1);
            
            // Create a copy of ticket types array
            const updatedTicketTypes = [...event.ticketTypes];
            updatedTicketTypes[ticketTypeIndex] = {
              ...ticketType,
              remaining: newRemaining,
              isSoldOut: newRemaining <= 0
            };
            
            // Update the event with new ticket types
            await ctx.db.patch(reservation.eventId, {
              ticketTypes: updatedTicketTypes
            });
          }
        }
      }
      
      return { success: true, message: "Reservation released successfully" };
    } catch (error) {
      console.error("[CONVEX M(releaseTickets:releaseTicket)] Error:", error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : "Unknown error releasing ticket" 
      };
    }
  }
});
