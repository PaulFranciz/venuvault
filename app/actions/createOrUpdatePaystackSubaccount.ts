"use server";

import { auth } from "@clerk/nextjs/server";
import { api } from "@/convex/_generated/api";
import { getConvexClient } from "@/lib/convex";
import Paystack from "paystack-node";

// Assuming you have this helper or similar
// import { getUserById } from "@/convex/users"; - This import seems incorrect, Convex queries are usually called via api

if (!process.env.PAYSTACK_SECRET_KEY) {
  throw new Error("PAYSTACK_SECRET_KEY is not set");
}

// Initialize Paystack client
const paystack = new Paystack(process.env.PAYSTACK_SECRET_KEY);
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

  try {
    // Try paystack.subaccounts.create (plural)
    const subaccount = await paystack.subaccounts.create({
      business_name: user.name || user.email,
      settlement_bank: bankCode,
      account_number: accountNumber,
      percentage_charge: 1.5, // ADJUST AS NEEDED
      primary_contact_email: user.email,
      primary_contact_name: user.name || user.email,
    });

    if (!subaccount.status || !subaccount.data?.subaccount_code) {
      console.error("Paystack subaccount creation failed:", subaccount);
      throw new Error(subaccount.message || "Failed to create Paystack subaccount.");
    }

    subaccountCode = subaccount.data.subaccount_code;
    console.log("Paystack subaccount created successfully:", subaccountCode);

    // Store subaccount code in Convex
    await convex.mutation(api.users.updateOrCreateUserPaystackSubaccountId, {
      userId,
      paystackSubaccountId: subaccountCode,
    });
    console.log("Stored Paystack subaccount code in Convex for user:", userId);

    return { subaccountCode };

  } catch (error: any) {
    // Catch errors from subaccount creation
    console.error("Error during Paystack subaccount creation API call:", error);
    let errorMessage = "Failed to create Paystack subaccount.";
    if (error.response?.data?.message) {
      errorMessage = error.response.data.message;
    } else if (error.message && !error.response) {
       errorMessage = error.message;
    }
    throw new Error(`Subaccount Creation Failed: ${errorMessage}`);
  }
} 