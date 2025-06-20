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

interface CustomerInfo {
  name: string;
  email: string;
  phone?: string;
}

interface TicketRecipient {
  name: string;
  email: string;
}

export type PaystackMetadata = {
  eventId: Id<"events">;
  userId: string;
  waitingListId: Id<"waitingList"> | null;
  cancel_action: string;
  tickets: Array<{ ticketTypeId: string; quantity: number }>;
  discountCode?: string;
  customerInfo?: CustomerInfo;
  recipients?: TicketRecipient[];
  absorbFees?: boolean;
};

// Structure of expected successful response data
interface InitializeSuccessData {
    authorization_url: string;
    access_code: string;
    reference: string;
}

export async function initializePaystackTransaction({
  eventId,
  tickets,
  discountCode,
  customerInfo,
  recipients
}: {
  eventId: Id<"events">;
  tickets: Array<{ ticketTypeId: string; quantity: number }>;
  discountCode?: string;
  customerInfo?: CustomerInfo;
  recipients?: TicketRecipient[];
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

  // Check waiting list status OR reservation status
  const queuePosition = await convex.query(api.waitingList.getQueuePosition, {
    eventId,
    userId,
  });

  // For traditional waiting list flow
  if (queuePosition && queuePosition.status === WAITING_LIST_STATUS.OFFERED) {
    if (!queuePosition.offerExpiresAt || queuePosition.offerExpiresAt < Date.now()) {
      throw new Error("Ticket offer has expired.");
    }
  } 
  // For new modal reservation flow - if no queue position exists, allow direct purchase
  // This supports the new high-performance modal system that bypasses traditional queue
  else if (queuePosition && queuePosition.status === WAITING_LIST_STATUS.WAITING) {
    throw new Error("Ticket not offered yet. You are on the waiting list.");
  }
  // If no queue position exists at all, this might be a direct reservation
  // We'll validate the tickets are still available below

  if (!Array.isArray(tickets) || tickets.length === 0) {
    throw new Error("No tickets provided");
  }

  let totalAmount = 0;

  for (const { ticketTypeId, quantity } of tickets) {
    const selectedType = event.ticketTypes?.find((t) => t.id === ticketTypeId);
    if (!selectedType) {
      throw new Error("Invalid ticket type selected.");
    }
    if (selectedType.remaining < quantity) {
      throw new Error(`Only ${selectedType.remaining} tickets of type "${selectedType.name}" are available.`);
    }

    totalAmount += selectedType.price * quantity;
  }

  // If all tickets are free, skip payment and create order directly
  if (totalAmount === 0) {
    try {
      // For free orders, process them directly without payment
      // Since we're in a server action, we can directly call the database
      // We'll use a workaround for TypeScript by casting the API path
      const orderData = await convex.mutation(
        // Use a string path to avoid TypeScript errors with the API structure
        "orders:createFreeTicketOrder" as any, {
        eventId,
        waitingListId: queuePosition?._id || null,
        tickets,
        customerInfo: customerInfo ? {
          name: customerInfo.name,
          email: customerInfo.email,
          phone: customerInfo.phone,
        } : {
          name: user.name,
          email: user.email,
        },
        recipients
      });
      
      // Return a direct URL to the success page with the order reference
      return {
        authorizationUrl: `${baseUrl}/payment/success?reference=${orderData.reference}`,
        reference: orderData.reference,
      };
    } catch (error) {
      console.error('Error processing free ticket:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to process free ticket');
    }
  }

  // Apply discount if provided
  if (discountCode) {
    try {
      const discountResult = await convex.mutation(api.discountCodes.applyCode, {
        code: discountCode,
        eventId
      });
      
      if (discountResult.success) {
        // Calculate discount
        let discountAmount = 0;
        if (discountResult.discountType === "percentage") {
          discountAmount = totalAmount * (discountResult.discountAmount / 100);
        } else {
          discountAmount = Math.min(totalAmount, discountResult.discountAmount);
        }
        
        totalAmount = Math.max(0, totalAmount - discountAmount);
      }
    } catch (error) {
      console.error("Error applying discount code:", error);
      // Continue without discount if there's an error
    }
  }

  // Calculate platform fee for paid tickets (8.5% + ₦100 per paid ticket)
  let totalFees = 0;
  for (const { ticketTypeId, quantity } of tickets) {
    const selectedType = event.ticketTypes?.find((t) => t.id === ticketTypeId);
    if (!selectedType) continue;
    if (selectedType.price > 0) {
      const feePerTicket = selectedType.price * 0.085 + 100;
      totalFees += feePerTicket * quantity;
    }
  }

  // Add fees if organizer is not absorbing them (pass fees to customer)
  if (!event.organizerAbsorbsFees) {
    totalAmount += totalFees;
  }

  // Get seller's subaccount code
  const sellerSubaccountId = await convex.query(
    api.users.getUsersPaystackSubaccountId,
    { userId: event.userId } // Get the subaccount of the EVENT CREATOR
  );

  if (!sellerSubaccountId) {
    throw new Error("Seller's Paystack account is not set up.");
  }

  const amountInKobo = Math.round(totalAmount * 100);
  const cancelUrl = `${baseUrl}/event/${eventId}`;
  const callbackUrl = `${baseUrl}/payment/success`;
  
  // Use provided customer info or fall back to user data
  const customerName = customerInfo?.name || user.name;
  const customerEmail = customerInfo?.email || user.email;

  const metadata: PaystackMetadata = {
    eventId,
    userId,
    waitingListId: queuePosition?._id || null,
    cancel_action: cancelUrl,
    tickets,
    discountCode,
    customerInfo: customerInfo ? {
      name: customerInfo.name,
      email: customerInfo.email,
      phone: customerInfo.phone
    } : undefined,
    recipients,
    organizerAbsorbsFees: event.organizerAbsorbsFees
  };

  const payload = {
      email: customerEmail,
      amount: amountInKobo,
      currency: "NGN",
      callback_url: callbackUrl,
      metadata: JSON.stringify(metadata),
      subaccount: sellerSubaccountId,
      bearer: "subaccount",
      first_name: customerName?.split(' ')[0],
      last_name: customerName?.split(' ').slice(1).join(' ')
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

  } catch (error: unknown) {
     console.error("Error during Paystack transaction initialization fetch/processing:", error);
     let errorMessage = "Failed to initialize Paystack transaction.";
      if (error instanceof Error) {
          errorMessage = error.message;
      }
     throw new Error(errorMessage);
  }
}