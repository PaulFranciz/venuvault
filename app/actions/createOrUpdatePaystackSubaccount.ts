"use server";

import { auth } from "@clerk/nextjs/server";
import { api } from "@/convex/_generated/api";
import { getConvexClient } from "@/lib/convex";

// Assuming you have this helper or similar
// import { getUserById } from "@/convex/users"; - This import seems incorrect, Convex queries are usually called via api

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_API_URL = "https://api.paystack.co";

if (!PAYSTACK_SECRET_KEY) {
  throw new Error("PAYSTACK_SECRET_KEY is not set");
}

// Initialize Paystack client
// const paystack = new Paystack(process.env.PAYSTACK_SECRET_KEY);
const convex = getConvexClient();

// --- Define Paystack Response Interfaces ---
interface PaystackCreateSubaccountSuccess {
  status: true;
  message: string;
  data: {
    integration?: number; // Optional fields based on observation/docs
    domain?: string;
    subaccount_code: string;
    business_name: string;
    description?: string | null;
    primary_contact_name?: string | null;
    primary_contact_email?: string | null;
    primary_contact_phone?: string | null;
    metadata?: Record<string, unknown> | null;
    percentage_charge: number;
    settlement_bank: string;
    account_number: string;
  };
}

interface PaystackErrorResponse {
  status: false;
  message: string;
  // data might be null or different structure on error
}

type PaystackSubaccountResponse = PaystackCreateSubaccountSuccess | PaystackErrorResponse;
// --- End Interfaces ---

export async function createOrUpdatePaystackSubaccount({
  bankCode,
  accountNumber,
}: {
  bankCode: string;
  accountNumber: string;
}) {
  const { userId } = await auth();
  if (!userId) throw new Error("Not authenticated");

  // Get user details
  const user = await convex.query(api.users.getUserById, { userId });
  if (!user) throw new Error("User not found in Convex");

  // Check if user already has a subaccount (still useful)
  const existingSubaccountId = await convex.query(
    api.users.getUsersPaystackSubaccountId,
    { userId }
  );

  if (existingSubaccountId) {
    console.log("User already has Paystack subaccount:", existingSubaccountId);
    // Return existing code - verification should happen before calling this if update is needed
    return { subaccountCode: existingSubaccountId };
  }

  // Assume verification happened successfully before this action was called
  console.log("Attempting to create new Paystack subaccount for user:", userId);
  let subaccountCode: string | null = null;

  // --- Define Payload for Paystack API ---
  const subaccountPayload = {
    business_name: user.name || user.email || `User ${userId}`, // Ensure a name is provided
    settlement_bank: bankCode, // Use parameter
    account_number: accountNumber, // Use parameter
    percentage_charge: 1.5, // Set your desired percentage charge
    primary_contact_email: user.email,
    primary_contact_name: user.name || user.email,
    // description: "Event Pulse Seller", // Optional description
    // metadata: { convexUserId: userId } // Optional metadata
  };

  try {
    // --- Perform the fetch call to Paystack --- 
    const response = await fetch(`${PAYSTACK_API_URL}/subaccount`, {
      method: 'POST',
      headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
      },
      body: JSON.stringify(subaccountPayload),
      cache: 'no-store'
    });

    console.log("Fetch Create Subaccount Status Code:", response.status);

    // Type the parsed response
    let responseData: PaystackSubaccountResponse;
    try {
      // Explicitly cast the parsed JSON
      responseData = await response.json() as PaystackSubaccountResponse;
    } catch (parseError) {
      console.error("Could not parse Paystack response body:", parseError);
      throw new Error(`Paystack API communication error (${response.status}). Could not parse response.`);
    }

    console.log("Parsed Paystack Create Subaccount Response:", responseData);

    if (!response.ok) {
      // responseData here might be PaystackErrorResponse, message access is safe
      console.error("Paystack API subaccount creation request failed:", { status: response.status, body: responseData });
      throw new Error(`Paystack API Error (${response.status}): ${responseData?.message || response.statusText}`);
    }

    // Check the structure of the SUCCESS response
    // We need to use a type guard or check `status` to assure TypeScript it's the success type
    if (!responseData || !responseData.status || !responseData.data?.subaccount_code) {
        console.error("Invalid Paystack success response structure after subaccount creation:", responseData);
        // Use the message from responseData if available
        throw new Error(responseData?.message || "Failed to create Paystack subaccount or invalid response structure.");
    }

    // Now TypeScript knows responseData is PaystackCreateSubaccountSuccess if we passed the above check
    // (or we rely on the `!responseData.data?.subaccount_code` check)
    subaccountCode = responseData.data.subaccount_code;
    console.log("Paystack subaccount created successfully via fetch:", subaccountCode);

    // Store subaccount code in Convex
    await convex.mutation(api.users.updateOrCreateUserPaystackSubaccountId, {
      userId,
      paystackSubaccountId: subaccountCode, // Known to be string here
    });
    console.log("Stored Paystack subaccount code in Convex for user:", userId);

    return { subaccountCode };

  } catch (error: unknown) {
    // Catch errors from subaccount creation
    console.error("Error during Paystack subaccount creation API call:", error);
    let errorMessage = "Failed to create Paystack subaccount.";
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (error instanceof Response && error.statusText) {
      errorMessage = error.statusText;
    }
    throw new Error(`Subaccount Creation Failed: ${errorMessage}`);
  }
} 