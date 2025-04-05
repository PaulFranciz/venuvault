"use server";

import { getConvexClient } from "@/lib/convex";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import baseUrl from "@/lib/baseUrl";
import { auth } from "@clerk/nextjs/server";
import { WAITING_LIST_STATUS } from "@/convex/constants";

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_API_URL = "https://api.paystack.co";

if (!PAYSTACK_SECRET_KEY) {
  throw new Error("PAYSTACK_SECRET_KEY is not set");
}

const convex = getConvexClient();

export type PaystackMetadata = {
  eventId: Id<"events">;
  userId: string;
  waitingListId: Id<"waitingList">;
  cancel_action: string;
};

// Structure of expected successful response data
interface InitializeSuccessData {
    authorization_url: string;
    access_code: string;
    reference: string;
}

export async function initializePaystackTransaction({
  eventId,
}: {
  eventId: Id<"events">;
}) {
  const { userId } = await auth();
  if (!userId) throw new Error("Not authenticated");

  // Get event details
  const event = await convex.query(api.events.getById, { eventId });
  if (!event) throw new Error("Event not found");
  if (event.is_cancelled) throw new Error("Event has been cancelled");

  // Get user details for email
  const user = await convex.query(api.users.getUserById, { userId });
   if (!user) throw new Error("User not found");

  // Check waiting list status
  const queuePosition = await convex.query(api.waitingList.getQueuePosition, {
    eventId,
    userId,
  });

  if (!queuePosition || queuePosition.status !== WAITING_LIST_STATUS.OFFERED) {
    throw new Error(
      queuePosition?.status === WAITING_LIST_STATUS.WAITING
        ? "Ticket not offered yet. You are on the waiting list."
        : "No valid ticket offer found or offer expired."
    );
  }
   if (!queuePosition.offerExpiresAt || queuePosition.offerExpiresAt < Date.now()) {
     throw new Error("Ticket offer has expired.");
   }


  // Get seller's subaccount code
  const sellerSubaccountId = await convex.query(
    api.users.getUsersPaystackSubaccountId,
    { userId: event.userId } // Get the subaccount of the EVENT CREATOR
  );

  if (!sellerSubaccountId) {
    throw new Error("Seller's Paystack account is not set up.");
  }

  const amountInKobo = Math.round(event.price * 100);
  const cancelUrl = `${baseUrl}/event/${eventId}`;
  const callbackUrl = `${baseUrl}/api/webhooks/paystack`;

  const metadata: PaystackMetadata = {
    eventId,
    userId,
    waitingListId: queuePosition._id,
    cancel_action: cancelUrl,
  };

  const payload = {
      email: user.email,
      amount: amountInKobo,
      currency: "NGN",
      callback_url: callbackUrl,
      metadata: JSON.stringify(metadata),
      subaccount: sellerSubaccountId,
      bearer: "subaccount",
  };

  console.log("Initializing Paystack transaction via fetch with payload:", payload);

  try {
     const response = await fetch(`${PAYSTACK_API_URL}/transaction/initialize`, {
       method: 'POST',
       headers: {
         Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
         'Content-Type': 'application/json',
       },
       body: JSON.stringify(payload),
     });

     console.log("Fetch Initialize Transaction Status Code:", response.status);

     let responseData;
     try {
       responseData = await response.json();
     } catch (parseError) {
       console.error("Could not parse Paystack response body:", parseError);
       throw new Error(`Paystack API communication error (${response.status}). Could not parse response.`);
     }

     console.log("Parsed Paystack Initialize Response:", responseData);

     if (!response.ok) {
         console.error("Paystack API initialize transaction request failed:", { status: response.status, body: responseData });
         throw new Error(`Paystack API Error (${response.status}): ${responseData?.message || response.statusText}`);
     }

     if (!responseData || !responseData.status || !responseData.data?.authorization_url) {
         console.error("Invalid Paystack response structure after transaction initialize:", responseData);
         throw new Error(responseData.message || "Failed to initialize transaction or invalid response structure.");
     }

    const data = responseData.data as InitializeSuccessData;
    console.log("Paystack transaction initialized successfully via fetch:", data.reference);

    return {
      authorizationUrl: data.authorization_url,
      accessCode: data.access_code,
      reference: data.reference,
    };

  } catch (error: any) {
     console.error("Error during Paystack transaction initialization fetch/processing:", error);
     let errorMessage = "Failed to initialize Paystack transaction.";
      if (error instanceof Error) {
          errorMessage = error.message;
      }
     throw new Error(errorMessage);
  }
} 