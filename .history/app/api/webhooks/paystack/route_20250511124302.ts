import { headers } from "next/headers";
import { getConvexClient } from "@/lib/convex";
import { api } from "@/convex/_generated/api";
import crypto from "crypto";
import { PaystackMetadata } from "@/app/actions/initializePaystackTransaction";

// Define expected Paystack event structure
interface PaystackEvent<T = Record<string, unknown>> { // Default data to Record
  event: string;
  data: T;
}

interface PaystackChargeData {
  id: number;
  domain: string;
  status: string; // e.g., "success"
  reference: string;
  amount: number; // Amount in kobo
  message: string | null;
  gateway_response: string;
  paid_at: string;
  created_at: string;
  channel: string;
  currency: string;
  ip_address: string;
  metadata: string; // The stringified metadata we sent
  log: Record<string, unknown> | null; // Use Record
  fees: number | null;
  fees_split: Record<string, unknown> | null; // Use Record
  authorization: {
    authorization_code: string;
    bin: string;
    last4: string;
    exp_month: string;
    exp_year: string;
    channel: string;
    card_type: string;
    bank: string;
    country_code: string;
    brand: string;
    reusable: boolean;
    signature: string;
    account_name: string | null;
  };
  customer: {
    id: number;
    first_name: string | null;
    last_name: string | null;
    email: string;
    customer_code: string;
    phone: string | null;
    metadata: Record<string, unknown> | null; // Use Record
    risk_action: string;
    international_format_phone: string | null;
  };
  plan: Record<string, unknown> | null; // Use Record
  subaccount: {
      subaccount_code: string;
      // Define other subaccount fields if needed, or use Record
      [key: string]: unknown; // Allow other unknown fields
  };
  // Allow other unknown top-level fields
  [key: string]: unknown;
}

export async function POST(req: Request) {
  console.log("Paystack webhook received");

  const secret = process.env.PAYSTACK_SECRET_KEY!; // Use Secret Key for verification
   if (!secret) {
       console.error("PAYSTACK_SECRET_KEY is not set for webhook verification.");
       return new Response("Webhook Error: Server configuration missing", { status: 500 });
   }

  const body = await req.text(); // Read body as text for hash verification
  const headersList = await headers();
  const signature = headersList.get("x-paystack-signature") as string;

  console.log("Paystack Signature:", signature ? "Present" : "Missing");

  if (!signature) {
    console.warn("Webhook Error: Missing x-paystack-signature header");
    return new Response("Webhook Error: Missing signature", { status: 400 });
  }

  // Verify webhook signature
  try {
    const hash = crypto
      .createHmac("sha512", secret)
      .update(body)
      .digest("hex");

    if (hash !== signature) {
      console.warn("Webhook Error: Invalid signature");
      return new Response("Webhook Error: Invalid signature", { status: 400 });
    }
    console.log("Webhook signature verified successfully.");
  } catch (err: unknown) { // Changed from any
    console.error("Webhook signature verification failed:", err);
    return new Response(`Webhook Error: ${err instanceof Error ? err.message : 'Unknown verification error'}`, {
      status: 400,
    });
  }

  let event: PaystackEvent<PaystackChargeData>;
   try {
     event = JSON.parse(body);
   } catch (err: unknown) { // Changed from any
     console.error("Webhook Error: Failed to parse JSON body:", err);
     return new Response("Webhook Error: Invalid JSON payload", { status: 400 });
   }


  const convex = getConvexClient();

  // Handle the charge success event
  if (event.event === "charge.success") {
    console.log("Processing charge.success event");
    const chargeData = event.data;

    // Double-check status just in case
    if (chargeData.status !== "success") {
        console.warn(`Received charge.success event but status is ${chargeData.status}. Skipping.`);
        return new Response("Webhook Warning: Event status mismatch", { status: 200 }); // Acknowledge receipt but don't process
    }


    let metadata: PaystackMetadata;
    try {
        // Metadata comes as a stringified JSON, parse it
         if (typeof chargeData.metadata === 'string' && chargeData.metadata.length > 0) {
           metadata = JSON.parse(chargeData.metadata);
           console.log("Parsed metadata:", metadata);
         } else if (typeof chargeData.metadata === 'object' && chargeData.metadata !== null) {
             // Allow object metadata but ensure it fits the type
             metadata = chargeData.metadata as PaystackMetadata;
             console.warn("Received pre-parsed object metadata:", metadata);
         }
          else {
             console.error("Webhook Error: Missing or invalid metadata in charge data.");
             return new Response("Webhook Error: Missing or invalid metadata", { status: 400 });
         }

         // Basic validation of metadata fields
         if (!metadata.eventId || !metadata.userId || !metadata.waitingListId) {
             console.error("Webhook Error: Incomplete metadata fields:", metadata);
              return new Response("Webhook Error: Incomplete metadata", { status: 400 });
         }

    } catch (err: unknown) { // Changed from any
        console.error("Webhook Error: Failed to parse metadata JSON:", err);
        console.error("Received metadata string/object:", chargeData.metadata);
        return new Response("Webhook Error: Invalid metadata format", { status: 400 });
    }


    console.log("Calling Convex purchaseTicket mutation with:", {
        eventId: metadata.eventId,
        userId: metadata.userId,
        waitingListId: metadata.waitingListId,
        ticketTypeId: metadata.ticketTypeId,
        quantity: metadata.quantity,
        paymentRef: chargeData.reference,
        amount: chargeData.amount // Amount in kobo
    });


    try {
      // Call your Convex mutation to record the purchase
      const result = await convex.mutation(api.events.purchaseTicket, {
        eventId: metadata.eventId,
        userId: metadata.userId,
        waitingListId: metadata.waitingListId,
        paymentInfo: {
          paystackReference: chargeData.reference, // Use the Paystack transaction reference
          amount: chargeData.amount / 100, // Convert amount from kobo back to main currency unit (e.g., Naira)
          currency: chargeData.currency, // Pass the currency from Paystack charge data
        },
      });
      console.log("Convex purchaseTicket mutation completed:", result);
    } catch (error: unknown) { // Changed from any
      console.error("Error calling Convex purchaseTicket mutation:", error);
      return new Response(`Webhook Error: ${error instanceof Error ? error.message : 'Failed to update database'}`, { status: 500 }); // Return specific message
    }
  } else {
      console.log(`Received unhandled Paystack event type: ${event.event}`);
  }

  // Acknowledge receipt of the webhook
  return new Response(null, { status: 200 });
}
