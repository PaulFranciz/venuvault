import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "cleanup-expired-offers",
  { minutes: 1 }, // Run every 1 minute
  internal.waitingList.cleanupExpiredOffers
);

// Cron job to publish events that have reached their scheduled publish time
crons.interval(
  "publishScheduledEvents",
  { minutes: 5 }, // Run every 5 minutes
  internal.events.publishScheduledEvents
);

export default crons;
