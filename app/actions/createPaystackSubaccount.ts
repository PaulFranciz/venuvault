"use server";

import { auth } from "@clerk/nextjs/server";
import { api } from "@/convex/_generated/api";
import { getConvexClient } from "@/lib/convex";
// Remove Paystack library import if only used for this call now
// import Paystack from "paystack-node";

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_API_URL = "https://api.paystack.co";

if (!PAYSTACK_SECRET_KEY) {
  throw new Error("PAYSTACK_SECRET_KEY is not set");
}

const convex = getConvexClient();

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

  // Check if user already has a subaccount
  const existingSubaccountId = await convex.query(
    api.users.getUsersPaystackSubaccountId,
    { userId }
  );

  if (existingSubaccountId) {
    console.log("User already has Paystack subaccount:", existingSubaccountId);
    return { subaccountCode: existingSubaccountId };
  }

  // Verification should have happened before calling this action
  console.log("Attempting to create new Paystack subaccount via fetch for user:", userId);
  let subaccountCode: string | null = null;

  // --- Create Subaccount using Fetch ---
  const subaccountPayload = {
    business_name: user.name || user.email, // Ensure this meets Paystack requirements
    settlement_bank: bankCode,
    account_number: accountNumber,
    percentage_charge: 1.5, // ADJUST AS NEEDED
    primary_contact_email: user.email, // Optional but recommended
    primary_contact_name: user.name || user.email, // Optional but recommended
    // metadata: { convexUserId: userId } // Optional
  };

  try {
    const response = await fetch(`${PAYSTACK_API_URL}/subaccount`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(subaccountPayload),
    });

    console.log("Fetch Create Subaccount Status Code:", response.status);

    let responseData;
    try {
      responseData = await response.json();
    } catch (parseError) {
      console.error("Could not parse Paystack response body:", parseError);
      throw new Error(`Paystack API communication error (${response.status}). Could not parse response.`);
    }

    console.log("Parsed Paystack Create Subaccount Response:", responseData);

    if (!response.ok) {
      console.error("Paystack API subaccount creation request failed:", { status: response.status, body: responseData });
      throw new Error(`Paystack API Error (${response.status}): ${responseData?.message || response.statusText}`);
    }

    if (!responseData || !responseData.status || !responseData.data?.subaccount_code) {
        console.error("Invalid Paystack response structure after subaccount creation:", responseData);
        throw new Error(responseData.message || "Failed to create Paystack subaccount or invalid response structure.");
    }

    subaccountCode = responseData.data.subaccount_code;
    console.log("Paystack subaccount created successfully via fetch:", subaccountCode);

    // Explicit null/undefined check before using the code
    if (!subaccountCode) { 
        console.error("Subaccount code is null/undefined after successful creation. This should not happen.");
        throw new Error("Internal Server Error: Failed to process subaccount code.");
    }

    // Store subaccount code in Convex
    // TypeScript should now know subaccountCode is a string here
    await convex.mutation(api.users.updateOrCreateUserPaystackSubaccountId, {
      userId,
      paystackSubaccountId: subaccountCode,
    });
    console.log("Stored Paystack subaccount code in Convex for user:", userId);

    return { subaccountCode };

  } catch (error: unknown) {
    // Catch fetch errors or errors thrown from checks/parsing
    console.error("Error during Paystack subaccount creation fetch/processing:", error);
    let errorMessage = "Failed to create Paystack subaccount.";
     if (error instanceof Error) {
         errorMessage = error.message;
     }
    // If it's specifically a Paystack API error from our checks, the message is already included
    throw new Error(errorMessage); // Throw the determined message
  }
}