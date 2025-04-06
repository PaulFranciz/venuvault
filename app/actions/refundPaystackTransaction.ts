"use server";

// Removed Paystack library import
// import Paystack from "paystack-node";
import { getConvexClient } from "@/lib/convex";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { TICKET_STATUS } from "@/convex/constants";

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_API_URL = "https://api.paystack.co";

if (!PAYSTACK_SECRET_KEY) {
  throw new Error("PAYSTACK_SECRET_KEY is not set");
}

const convex = getConvexClient();

// Structure for successful refund data (optional, for logging/checking)
interface PaystackRefundData {
    status: boolean;
    message: string;
    data?: {
        transaction: Record<string, unknown>; // Use Record<string, unknown> instead of any
        refund: Record<string, unknown>; // Use Record<string, unknown> instead of any
    }
}


export async function refundPaystackTransaction(eventId: Id<"events">) {
  console.log("Starting refund process via fetch for event:", eventId);

  // Get event details (needed for seller user ID)
  const event = await convex.query(api.events.getById, { eventId });
  if (!event) throw new Error(`Event not found: ${eventId}`);

  // Get all 'valid' or 'used' tickets for this event that have a Paystack reference
  const ticketsToRefund = await convex.query(api.tickets.getValidTicketsForEvent, {
    eventId,
  });

   console.log(`Found ${ticketsToRefund.length} tickets to potentially refund for event ${eventId}`);

  if (ticketsToRefund.length === 0) {
      console.log("No valid tickets found with Paystack references to refund.");
       // Still cancel the event in Convex even if no tickets to refund
       await convex.mutation(api.events.cancelEvent, { eventId });
       console.log("Event cancelled in Convex (no tickets to refund).");
      return { success: true, message: "Event cancelled. No tickets required refunding." };
  }

  // Process refunds using fetch
  const results = await Promise.allSettled(
    ticketsToRefund.map(async (ticket) => {
      if (!ticket.paystackReference) {
           console.warn(`Ticket ${ticket._id} is missing Paystack reference, skipping refund.`);
        // Decide how to handle this: error out, or just skip? Skipping for now.
        return { success: true, skipped: true, ticketId: ticket._id, reason: "Missing Paystack reference" };
        // OR: throw new Error(`Ticket ${ticket._id} is missing Paystack reference.`);
      }

      console.log(`Attempting refund via fetch for ticket ${ticket._id} with reference ${ticket.paystackReference}`);
      const refundPayload = {
          transaction: ticket.paystackReference,
          // amount: ticket.amount ? ticket.amount * 100 : undefined // Optional: Full refund if omitted
      };

      try {
         // Issue refund through Paystack using fetch
         const response = await fetch(`${PAYSTACK_API_URL}/refund`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(refundPayload),
         });

         console.log(`Fetch Refund Status Code for Ref ${ticket.paystackReference}:`, response.status);

         let responseData: PaystackRefundData | { message?: string, status?: boolean }; // Type for success or error shape
         try {
             responseData = await response.json();
         } catch (parseError) {
             console.error("Could not parse Paystack refund response body:", parseError);
             throw new Error(`Paystack API communication error (${response.status}). Could not parse refund response.`);
         }

         console.log(`Parsed Paystack Refund Response for Ref ${ticket.paystackReference}:`, responseData);

         if (!response.ok) {
             console.error(`Paystack API refund request failed for Ref ${ticket.paystackReference}:`, { status: response.status, body: responseData });
             throw new Error(`Paystack API Error (${response.status}): ${responseData?.message || response.statusText}`);
         }

         // Check structure/status from parsed data
         if (!responseData || !responseData.status) { // Successful refund should have status: true
             console.error(`Paystack refund failed based on response data for Ref ${ticket.paystackReference}:`, responseData);
             throw new Error(responseData?.message || `Paystack refund failed for reference ${ticket.paystackReference}`);
         }

         console.log(`Refund successful via fetch for reference ${ticket.paystackReference}.`);

        // Update ticket status in Convex
        await convex.mutation(api.tickets.updateTicketStatus, {
          ticketId: ticket._id,
          status: TICKET_STATUS.REFUNDED,
        });
         console.log(`Updated ticket ${ticket._id} status to refunded in Convex.`);

        // Only try to access .data if responseData actually contains it (implies success)
        const refundData = 'data' in responseData ? responseData.data : undefined;
        return { success: true, ticketId: ticket._id, refundData: refundData };

      } catch (error: unknown) {
        // Catch fetch/parsing errors or errors thrown from checks
        console.error(`Failed to process refund for ticket ${ticket._id} (Ref: ${ticket.paystackReference}):`, error);
         let errorMessage = "Unknown refund processing error";
         if (error instanceof Error) {
             errorMessage = error.message;
         }
        return { success: false, ticketId: ticket._id, error: errorMessage }; // Return failure details
      }
    })
  );

  // Check results
  const failedRefunds = results.filter(
    (result) => result.status === "fulfilled" && !result.value.success && !result.value.skipped
  );
  const skippedRefunds = results.filter(
    (result) => result.status === "fulfilled" && result.value.skipped
  );
   const rejectedPromises = results.filter(result => result.status === 'rejected');


  if (failedRefunds.length > 0 || rejectedPromises.length > 0) {
    console.error("Some refunds failed or promises were rejected:", { failedRefunds, rejectedPromises });
    // Don't cancel the event in Convex if refunds failed, allow manual retry/check
    throw new Error(
      `Event cancellation partially failed. ${failedRefunds.length + rejectedPromises.length} refund(s) failed. Check logs for details.`
    );
  }

   console.log(`Refund process completed via fetch. ${ticketsToRefund.length - skippedRefunds.length} processed, ${skippedRefunds.length} skipped.`);

  // If all refunds succeeded (or were skipped), cancel the event in Convex
  await convex.mutation(api.events.cancelEvent, { eventId });
  console.log("Event cancelled in Convex after successful refunds (or skips).");

  return { success: true, message: "Event cancelled and all applicable tickets refunded successfully." };
} 