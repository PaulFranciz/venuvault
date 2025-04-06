"use server";

// Removed Paystack import as we use fetch now
// import Paystack from "paystack-node";
import { z } from 'zod';

// Define input schema for validation
const verifyInputSchema = z.object({
    accountNumber: z.string().length(10, "Account number must be 10 digits"),
    bankCode: z.string().min(1, "Bank code is required"),
});

// Define the structure of the successful verification data
interface VerificationSuccessData {
    account_number: string;
    account_name: string;
    bank_id: number;
}

// Define the return type for the action
export interface VerificationResult {
    success: boolean;
    accountName?: string;
    message?: string;
}

// Ensure Paystack secret key is set
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
if (!PAYSTACK_SECRET_KEY) {
  throw new Error("PAYSTACK_SECRET_KEY is not set");
}

const PAYSTACK_API_URL = "https://api.paystack.co"; // Paystack base URL

export async function verifyPaystackBankAccount(
    params: { accountNumber: string, bankCode: string }
): Promise<VerificationResult> {
    console.log(`Attempting verification via fetch for Account: ${params.accountNumber}, Bank Code: ${params.bankCode}`);

    // Validate input
    const validation = verifyInputSchema.safeParse(params);
    if (!validation.success) {
        const firstError = validation.error.errors[0]?.message || "Invalid input";
        console.error("Verification input validation failed:", validation.error.flatten());
        return { success: false, message: `Input Error: ${firstError}` };
    }

    const { accountNumber, bankCode } = validation.data;

    // Construct URL with query parameters
    const url = new URL(`${PAYSTACK_API_URL}/bank/resolve`);
    url.searchParams.append('account_number', accountNumber);
    url.searchParams.append('bank_code', bankCode);

    try {
        // Use fetch to call the Paystack API directly
        const response = await fetch(url.toString(), {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
                'Content-Type': 'application/json',
            },
            cache: 'no-store' // Verification should likely not be cached
        });

        console.log("Fetch Verification Status Code:", response.status);

        // Parse the JSON response regardless of status code to get potential error messages
        let responseData;
        try {
            responseData = await response.json();
        } catch (parseError) {
             console.error("Could not parse Paystack response body:", parseError);
             throw new Error(`Paystack API communication error (${response.status}). Could not parse response.`);
        }

         console.log("Parsed Paystack Verification Response:", responseData);

        // Check HTTP status code first
        if (!response.ok) {
            console.error("Paystack API verification request failed:", { status: response.status, body: responseData });
            // Use message from parsed body if available, otherwise use statusText
            throw new Error(`Paystack API Error (${response.status}): ${responseData?.message || response.statusText}`);
        }

        // Check the structure and status from the parsed data
        if (!responseData || !responseData.status || !responseData.data?.account_name) {
            console.warn("Paystack verification check failed based on response data:", responseData?.message || "Missing expected data.");
            return { success: false, message: responseData?.message || "Bank account details could not be verified by Paystack." };
        }

        // Verification successful
        const data = responseData.data as VerificationSuccessData;
        console.log(`Verification successful. Account Name: ${data.account_name}`);
        return { success: true, accountName: data.account_name };

    } catch (error: unknown) {
        // Catch fetch errors or errors thrown from response checks/parsing
        console.error("Error during Paystack verification fetch/processing:", error);
        let errorMessage = "Failed to verify bank account details due to a server error.";
        if (error instanceof Error) { // Use the specific error message thrown
           errorMessage = error.message;
        }
        // Prepend context to the error message before returning
        return { success: false, message: `Verification Failed: ${errorMessage}` };
    }
} 