import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { DURATIONS, WAITING_LIST_STATUS, TICKET_STATUS } from "./constants";
import { api, internal } from "./_generated/api";

/**
 * Helper function to group waiting list entries by event ID.
 * Used for batch processing expired offers by event.
 */
function groupByEvent(
  offers: Array<{ eventId: Id<"events">; _id: Id<"waitingList"> }>
) {
  return offers.reduce(
    (acc, offer) => {
      const eventId = offer.eventId;
      if (!acc[eventId]) {
        acc[eventId] = [];
      }
      acc[eventId].push(offer);
      return acc;
    },
    {} as Record<Id<"events">, typeof offers>
  );
}

/**
 * Query to get a user's current position in the waiting list for an event.
 * Returns null if user is not in queue, otherwise returns their entry with position.
 */
export const getQueuePosition = query({
  args: {
    eventId: v.id("events"),
    userId: v.string(),
  },
  handler: async (ctx, { eventId, userId }) => {
    // Get entry for this specific user and event combination
    const entry = await ctx.db
      .query("waitingList")
      .withIndex("by_user_event", (q) =>
        q.eq("userId", userId).eq("eventId", eventId)
      )
      .filter((q) => q.neq(q.field("status"), WAITING_LIST_STATUS.EXPIRED))
      .first();

    if (!entry) return null;

    // Get total number of people ahead in line
    const peopleAhead = await ctx.db
      .query("waitingList")
      .withIndex("by_event_status", (q) => q.eq("eventId", eventId))
      .filter((q) =>
        q.and(
          q.lt(q.field("_creationTime"), entry._creationTime),
          q.or(
            q.eq(q.field("status"), WAITING_LIST_STATUS.WAITING),
            q.eq(q.field("status"), WAITING_LIST_STATUS.OFFERED)
          )
        )
      )
      .collect()
      .then((entries) => entries.length);

    return {
      ...entry,
      position: peopleAhead + 1,
    };
  },
});

/**
 * Mutation to process the waiting list queue and offer tickets to next eligible users.
 * Checks current availability considering purchased tickets and active offers.
 */
export const processQueue = mutation({
  args: {
    eventId: v.id("events"),
  },
  handler: async (ctx, { eventId }) => {
    console.log(`[processQueue] Starting for eventId: ${eventId}`);
    const event = await ctx.db.get(eventId);
    if (!event) {
      console.error(`[processQueue] Event not found for eventId: ${eventId}`);
      throw new Error("Event not found");
    }
    console.log(`[processQueue] Found event: ${event.name}`);

    // Calculate available spots
    const { availableSpots } = await ctx.db
      .query("events")
      .filter((q) => q.eq(q.field("_id"), eventId))
      .first()
      .then(async (event) => {
        if (!event) throw new Error("Event not found");

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

        const now = Date.now();
        const activeOffers = await ctx.db
          .query("waitingList")
          .withIndex("by_event_status", (q) =>
            q.eq("eventId", eventId).eq("status", WAITING_LIST_STATUS.OFFERED)
          )
          .collect()
          .then(
            (entries) =>
              entries.filter((e) => (e.offerExpiresAt ?? 0) > now).length
          );

        console.log(`[processQueue] Purchased count: ${purchasedCount}, Active offers: ${activeOffers}, Total tickets: ${event.totalTickets}`);
        return {
          availableSpots: event.totalTickets - (purchasedCount + activeOffers),
        };
      });

    console.log(`[processQueue] Calculated availableSpots: ${availableSpots} for eventId: ${eventId}`);

    if (availableSpots <= 0) {
      console.log(`[processQueue] No available spots for eventId: ${eventId}. Exiting.`);
      return;
    }

    // Get next users in line
    let waitingUsers;
    const waitingUsersQuery = ctx.db
      .query("waitingList")
      .withIndex("by_event_status", (q) =>
        q.eq("eventId", eventId).eq("status", WAITING_LIST_STATUS.WAITING)
      )
      .order("asc");

    if (availableSpots === Infinity) {
      console.log(`[processQueue] Event has unlimited available spots. Offering to all waiting users for eventId: ${eventId}`);
      waitingUsers = await waitingUsersQuery.collect();
    } else {
      // availableSpots is a positive finite number here
      console.log(`[processQueue] Offering to next ${availableSpots} users for eventId: ${eventId}`);
      waitingUsers = await waitingUsersQuery.take(availableSpots);
    }

    console.log(`[processQueue] Found ${waitingUsers.length} waiting users for eventId: ${eventId}`);

    // Create time-limited offers for selected users
    const now = Date.now();
    for (const user of waitingUsers) {
      console.log(`[processQueue] Processing user ${user._id} for eventId: ${eventId}`);
      // Update the waiting list entry to OFFERED status
      await ctx.db.patch(user._id, {
        status: WAITING_LIST_STATUS.OFFERED,
        offerExpiresAt: now + DURATIONS.TICKET_OFFER,
        // Maintain existing ticketTypeId and quantity if present
        ...(user.ticketTypeId && { ticketTypeId: user.ticketTypeId }),
        ...(user.quantity && { quantity: user.quantity })
      });

      // Schedule expiration job for this offer
      await ctx.scheduler.runAfter(
        DURATIONS.TICKET_OFFER,
        internal.waitingList.expireOffer,
        {
          waitingListId: user._id,
          eventId,
        }
      );
    }
  },
});

/**
 * Internal mutation to expire a single offer and process queue for next person.
 * Called by scheduled job when offer timer expires.
 */
export const expireOffer = internalMutation({
  args: {
    waitingListId: v.id("waitingList"),
    eventId: v.id("events"),
  },
  handler: async (ctx, { waitingListId, eventId }) => {
    const offer = await ctx.db.get(waitingListId);
    if (!offer || offer.status !== WAITING_LIST_STATUS.OFFERED) return;

    await ctx.db.patch(waitingListId, {
      status: WAITING_LIST_STATUS.EXPIRED,
    });

    await ctx.runMutation(api.waitingList.processQueue, { eventId });
  },
});

/**
 * Periodic cleanup job that acts as a fail-safe for expired offers.
 * While individual offers should expire via scheduled jobs (expireOffer),
 * this ensures any offers that weren't properly expired (e.g. due to server issues)
 * are caught and cleaned up. Also helps maintain data consistency.
 *
 * Groups expired offers by event for efficient processing and updates queue
 * for each affected event after cleanup.
 */
export const cleanupExpiredOffers = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    // Find all expired but not yet cleaned up offers
    const expiredOffers = await ctx.db
      .query("waitingList")
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), WAITING_LIST_STATUS.OFFERED),
          q.lt(q.field("offerExpiresAt"), now)
        )
      )
      .collect();

    // Group by event for batch processing
    const grouped = groupByEvent(expiredOffers);

    // Process each event's expired offers and update queue
    for (const [eventId, offers] of Object.entries(grouped)) {
      await Promise.all(
        offers.map((offer) =>
          ctx.db.patch(offer._id, {
            status: WAITING_LIST_STATUS.EXPIRED,
          })
        )
      );

      await ctx.runMutation(api.waitingList.processQueue, { eventId: eventId as Id<"events"> });
    }
  },
});

export const releaseTicket = mutation({
  args: {
    eventId: v.id("events"),
    waitingListId: v.id("waitingList"),
  },
  handler: async (ctx, { eventId, waitingListId }) => {
    console.log(`[releaseTicket] Starting for eventId: ${eventId}, waitingListId: ${waitingListId}`);

    const waitingListEntry = await ctx.db.get(waitingListId);
    if (!waitingListEntry) {
      console.error(`[releaseTicket] Waiting list entry not found: ${waitingListId}`);
      // Optionally, decide if this should throw an error or return gracefully
      // For now, let's log and attempt to proceed with queue processing if eventId is valid
      // but this situation might indicate a problem.
    } else {
      console.log(`[releaseTicket] Found waiting list entry, current status: ${waitingListEntry.status}`);
      // Mark the waiting list entry as EXPIRED
      try {
        await ctx.db.patch(waitingListId, {
          status: WAITING_LIST_STATUS.EXPIRED,
        });
        console.log(`[releaseTicket] Successfully patched waitingListId ${waitingListId} to EXPIRED.`);
      } catch (patchError) {
        console.error(`[releaseTicket] Error patching waitingListId ${waitingListId}:`, patchError);
        throw new Error(`Failed to update waiting list entry: ${patchError}`); // Re-throw to indicate failure
      }
    }

    // Process the queue to offer the spot to the next person
    try {
      console.log(`[releaseTicket] Calling processQueue for eventId: ${eventId}`);
      await ctx.runMutation(api.waitingList.processQueue, { eventId });
      console.log(`[releaseTicket] Successfully processed queue for eventId: ${eventId}`);
    } catch (processQueueError) {
      console.error(`[releaseTicket] Error processing queue for eventId ${eventId}:`, processQueueError);
      // Decide if this error should also be re-thrown. If processQueue is critical for release, then yes.
      throw new Error(`Failed to process queue after releasing ticket: ${processQueueError}`);
    }
  },
});
