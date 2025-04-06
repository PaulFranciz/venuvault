"use server";

// Remove the direct import/dependency on paystack-node for this specific function
// import Paystack from "paystack-node";

// Define the expected structure for a bank object from Paystack
export interface PaystackBank {
    id: number;
    name: string;
    slug: string;
    code: string; // This is the code we need for subaccounts
    longcode: string;
    gateway: string | null;
    pay_with_bank: boolean;
    active: boolean;
    is_deleted: boolean;
    country: string;
    currency: string;
    type: string;
    createdAt: string;
    updatedAt: string;
}

// Ensure Paystack secret key is set
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
if (!PAYSTACK_SECRET_KEY) {
  throw new Error("PAYSTACK_SECRET_KEY is not set");
}

const PAYSTACK_API_URL = "https://api.paystack.co"; // Paystack base URL

export async function getPaystackBankList(): Promise<PaystackBank[]> {
  console.log("Fetching Paystack bank list using fetch...");

  try {
    // Use fetch to call the Paystack API directly
    const response = await fetch(`${PAYSTACK_API_URL}/bank?country=nigeria&use_cursor=false&perPage=500`, { // Added perPage to get more banks
      method: 'GET',
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store' // Prevent caching of the bank list if desired
    });

    console.log("Fetch Response Status Code:", response.status);

    if (!response.ok) {
       // Attempt to parse error body from Paystack if possible
       let errorBody: { message?: string } = {}; // Give errorBody a potential shape
       try {
            errorBody = await response.json();
       } catch (parseError) {
            console.error("Could not parse error response body:", parseError);
       }
      console.error("Paystack API request failed:", { status: response.status, statusText: response.statusText, body: errorBody });
      // Use message from parsed body safely
      throw new Error(`Paystack API Error (${response.status}): ${ errorBody?.message || response.statusText}`);
    }

    // Parse the successful JSON response
    const responseData = await response.json();

    // Log parts of the parsed response data
    console.log("Parsed Paystack Response Status:", responseData?.status);
    console.log("Parsed Paystack Response Message:", responseData?.message);
    console.log("Parsed Paystack Response Data Type:", Array.isArray(responseData?.data) ? `Array (Length: ${responseData.data.length})` : typeof responseData?.data);


    // Check the PARSED response structure
    if (!responseData || !responseData.status || !responseData.data || !Array.isArray(responseData.data)) {
      console.error("Invalid Paystack response structure after JSON parse:", responseData);
      throw new Error(responseData.message || "Invalid bank list structure after JSON parse");
    }

    console.log("Response structure OK. Processing data...");
    const banks = responseData.data as PaystackBank[];
    console.log(`Total banks received: ${banks.length}`);

    console.log("Filtering active banks...");
    const activeBanks = banks.filter((bank) => bank.active && bank.code);
    console.log(`Active banks found: ${activeBanks.length}`);

    console.log("Sorting banks...");
    activeBanks.sort((a, b) => a.name.localeCompare(b.name));
    console.log("Banks sorted. Returning list.");

    return activeBanks;

  } catch (error: unknown) { // Changed from any
    // Catch fetch errors or errors thrown from response checks
     console.error("Error in getPaystackBankList catch block:", error);
     let errorMessage = "Failed to fetch bank list";
      if (error instanceof Error) {
          errorMessage = error.message; // Use the error message directly
      }
     // Avoid logging generic paystackError details if it was a fetch/parsing error
     throw new Error(errorMessage);
  }
}