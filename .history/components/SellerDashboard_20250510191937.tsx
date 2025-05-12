"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  getPaystackSubaccountStatus,
  PaystackAccountStatus,
} from "@/app/actions/getPaystackSubaccountStatus";
import Spinner from "./Spinner";
import { CalendarDays, Plus } from "lucide-react";
import PaystackOnboardingForm from "./PaystackOnboardingForm";

// --- Payout Account Status Display Component --- (Adapted from previous example)
function PayoutAccountStatusDisplay({ status }: { status: PaystackAccountStatus }) {

    if (!status || !status.subaccountCode) {
        // This case should ideally be handled by the parent checking subaccountCode before rendering this
        return (
             <p className="text-center text-gray-500">Payout account not linked.</p>
        )
    }

    const isReady = status.isActive && status.hasBankDetails;

    return (
        <div className="bg-gray-50 rounded-lg p-6 border border-gray-200 space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Payout Account Status</h3>
            <div className="flex items-center">
                 <span className={`w-3 h-3 rounded-full mr-2 ${isReady ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
                 <span className="font-medium">
                     {isReady ? "Active & Ready" : "Needs Attention"}
                 </span>
            </div>
             <p className="text-sm text-gray-600">
                 {status.message || (isReady ? "Your account is ready to receive payouts." : "Account may be inactive or bank details incomplete.")}
             </p>
             <p className="text-xs text-gray-500">Subaccount Code: {status.subaccountCode}</p>
             <a href="https://dashboard.paystack.com/#/login" target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                 Go to Paystack Dashboard
             </a>
        </div>
    );
}


// --- Main Seller Dashboard Component ---
export default function SellerDashboard() {
  const { user } = useUser();
  const [statusLoading, setStatusLoading] = useState(true);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [paystackStatus, setPaystackStatus] = useState<PaystackAccountStatus | null>(null);

  // Get the query result directly. It will be string | null | undefined.
  const paystackSubaccountId = useQuery(api.users.getUsersPaystackSubaccountId,
     user?.id ? { userId: user.id } : "skip"
  );

  // Determine loading state: loading if userId exists but result is undefined.
  const idLoading = !!user?.id && paystackSubaccountId === undefined;

  const isReadyToAcceptPayments = paystackStatus?.isActive && paystackStatus?.hasBankDetails;

  // Fetch Paystack status when subaccount ID is available (is string or null) and not loading
  useEffect(() => {
    const fetchStatus = async () => {
      // Only fetch if idLoading is false (meaning query has resolved or user.id is missing)
      if (!idLoading) {
          // Check if we have a valid subaccount ID (string) vs. none (null)
          if (typeof paystackSubaccountId === 'string') {
             console.log("Subaccount ID found, fetching Paystack status...");
             setStatusLoading(true);
             setStatusError(null);
             try {
               const result = await getPaystackSubaccountStatus();
               setPaystackStatus(result);
             } catch (err) {
               console.error("Failed to fetch Paystack status:", err);
               setStatusError(
                 err instanceof Error ? err.message : "Could not fetch account status."
               );
               setPaystackStatus(null); // Clear previous status on error
             } finally {
               setStatusLoading(false);
             }
           } else if (paystackSubaccountId === null) {
             // User exists, query ran, but no subaccount found
             console.log("Query loaded: No Paystack subaccount linked for user.");
             setPaystackStatus(null);
             setStatusLoading(false);
             setStatusError(null);
           } else {
             // Handle unexpected states or initial undefined state before user.id is ready
             console.log("No user ID or subaccount ID not yet determined.");
             setPaystackStatus(null);
             setStatusLoading(false);
             setStatusError(null);
           }
       }
    };

     fetchStatus();

  }, [paystackSubaccountId, idLoading]); // Rerun when ID or loading state changes

  const handleOnboardingSuccess = () => {
    console.log("Onboarding successful. UI will refresh when query updates.");
    // TODO: Implement a more robust refresh mechanism if needed, e.g., state update or page reload.
    // The useQuery hook *should* automatically update when the underlying data changes in Convex
    // after the createOrUpdatePaystackSubaccount mutation completes, but this might take time or fail.
    // A simple reload might be the easiest initial solution:
    // window.location.reload();
  };

  // Show spinner only while the user ID is available but the query result is still undefined
  if (idLoading) {
    return <Spinner />;
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-8">
        {/* Header Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 px-6 py-8 text-white rounded-lg shadow-md">
          <h2 className="text-2xl font-bold">Seller Dashboard</h2>
          <p className="text-blue-100 mt-2">
          Manage your events and payout settings
          </p>
        </div>

       {/* Create/View Events Section (Show only if ready) */}
        {isReadyToAcceptPayments && (
           <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
             <h3 className="text-xl font-semibold text-gray-900 mb-4">
               Manage Your Events
             </h3>
             <div className="flex flex-col sm:flex-row justify-center gap-4">
                  <Link
                    href="/seller/new-event"
                 className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                 Create New Event
                  </Link>
                  <Link
                    href="/seller/events"
                 className="flex items-center justify-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    <CalendarDays className="w-5 h-5" />
                    View My Events
                  </Link>
                </div>
              </div>
       )}

      {/* Payout Setup / Status Section */}
      <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
         {/* Show onboarding form only if the query has finished loading (idLoading is false) AND the result is null */}
         {paystackSubaccountId === null && !idLoading && (
          <PaystackOnboardingForm onSuccess={handleOnboardingSuccess} />
        )}

        {/* Show status only if the query finished, result is non-null (string), status finished loading, and status exists */}
        {typeof paystackSubaccountId === 'string' && !statusLoading && paystackStatus && (
          <PayoutAccountStatusDisplay status={paystackStatus} />
        )}

        {/* Show status loading spinner only if we have an ID but status is still loading */}
        {typeof paystackSubaccountId === 'string' && statusLoading && (
             <Spinner />
         )}

        {/* Show status error only if we have an ID, status finished loading, and there was an error */}
        {typeof paystackSubaccountId === 'string' && !statusLoading && statusError && (
           <p className="text-red-600 text-center">Error loading payout status: {statusError}</p>
        )}

        {/* Optional: Handle case where status loaded but is unexpectedly null/missing */}
        {typeof paystackSubaccountId === 'string' && !statusLoading && !paystackStatus && !statusError && (
             <p className="text-center text-gray-500">Could not retrieve payout status details.</p>
        )}

      </div>


    </div>
  );
}
