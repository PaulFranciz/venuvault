"use server";

// Remove Paystack library import
// import Paystack from "paystack-node";
import { getConvexClient } from "@/lib/convex";
import { api } from "@/convex/_generated/api";
import { auth } from "@clerk/nextjs/server";

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_API_URL = "https://api.paystack.co";

if (!PAYSTACK_SECRET_KEY) {
  throw new Error("PAYSTACK_SECRET_KEY is not set");
}

const convex = getConvexClient();

// Structure of the expected data within the subaccount details response
interface PaystackSubaccountData {
    id: number;
    subaccount_code: string;
    business_name: string;
    description: string | null;
    primary_contact_name: string | null;
    primary_contact_email: string | null;
    primary_contact_phone: string | null;
    metadata: any | null;
    percentage_charge: number;
    is_verified: boolean;
    settlement_bank: string; // e.g., "Guaranty Trust Bank"
    account_number: string;
    settlement_schedule: string; // e.g., "AUTO"
    active: boolean; // Status we need
    migrate: boolean;
    integration: number;
    domain: string;
    account_name?: string; // Included in newer responses
    bank: number;
    createdAt: string;
    updatedAt: string;
}

export type PaystackAccountStatus = {
  isActive: boolean;
  hasBankDetails: boolean;
  subaccountCode: string | null;
  message?: string;
};

export async function getPaystackSubaccountStatus(): Promise<PaystackAccountStatus> {
  const { userId } = await auth();
  if (!userId) throw new Error("Not authenticated");

  console.log("Fetching Paystack subaccount status via fetch for user:", userId);

  // 1. Get the user's subaccount code from Convex
  const subaccountCode = await convex.query(
    api.users.getUsersPaystackSubaccountId,
    { userId }
  );

  if (!subaccountCode) {
    console.log("No Paystack subaccount linked for user:", userId);
    return {
      isActive: false,
      hasBankDetails: false,
      subaccountCode: null,
      message: "Paystack account not linked.",
    };
  }

  console.log("Found subaccount code:", subaccountCode, "Fetching details from Paystack via fetch.");

  // 2. Fetch subaccount details from Paystack using fetch
  try {
    const response = await fetch(`${PAYSTACK_API_URL}/subaccount/${subaccountCode}`, {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
            'Content-Type': 'application/json',
        },
        cache: 'no-store' // Fetch fresh status
    });

    console.log("Fetch Get Subaccount Status Code:", response.status);

    let responseData;
     try {
       responseData = await response.json();
     } catch (parseError) {
       console.error("Could not parse Paystack response body:", parseError);
       throw new Error(`Paystack API communication error (${response.status}). Could not parse response.`);
     }

     console.log("Parsed Paystack Get Subaccount Response:", responseData);


    if (!response.ok) {
        console.error("Paystack API get subaccount request failed:", { status: response.status, body: responseData });
        throw new Error(`Paystack API Error (${response.status}): ${responseData?.message || response.statusText}`);
    }

    if (!responseData || !responseData.status || !responseData.data) {
        console.error("Invalid Paystack response structure after get subaccount:", responseData);
        throw new Error(responseData?.message || "Invalid response structure from Paystack getting subaccount.");
    }

    const data = responseData.data as PaystackSubaccountData;

    const isActive = data.active === true;
    // Use the actual fields returned by the GET subaccount endpoint
    const hasBankDetails = !!(data.settlement_bank && data.account_number);

    return {
      isActive: isActive,
      hasBankDetails: hasBankDetails,
      subaccountCode: subaccountCode,
      message: !hasBankDetails ? "Bank details might be missing or incomplete." : (isActive ? undefined : "Account may be inactive."),
    };

  } catch (error: any) {
     console.error(`Error fetching Paystack subaccount status for code ${subaccountCode} via fetch:`, error);
     let errorMessage = "Failed to fetch Paystack subaccount status";
       if (error instanceof Error) {
           errorMessage = error.message;
       }
     throw new Error(errorMessage); // Rethrow the specific error message
  }
} 