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
import OrganizerOnboardingStepper from "./OrganizerOnboardingStepper";

// --- Payout Account Status Display Component --- (Adapted from previous example)
function PayoutAccountStatusDisplay({ status }: { status: PaystackAccountStatus }) {

    if (!status || !status.subaccountCode) {
        // This case should ideally be handled by the parent checking subaccountCode before rendering this
        return (
             <p className="text-center text-gray-500">Payout account not linked or status unavailable.</p>
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
  
  // TODO: Replace these with a comprehensive Convex query for onboarding status
  // For example: const onboardingDetails = useQuery(api.users.getOrganizerOnboardingDetails, user?.id ? { userId: user.id } : "skip");
  // const isFullyOnboarded = onboardingDetails?.isFullyOnboarded;
  // const paystackSubaccountId = onboardingDetails?.paystackSubaccountId;
  // const initialLoading = onboardingDetails === undefined && !!user?.id;

  // Placeholder states until Convex query is implemented
  const [isFullyOnboarded, setIsFullyOnboarded] = useState(false); // SIMULATED: Assume not onboarded initially
  const [initialLoading, setInitialLoading] = useState(true); // SIMULATED: To show spinner initially

  // Current query for Paystack subaccount ID (will be part of the comprehensive query later)
  const paystackSubaccountIdQuery = useQuery(api.users.getUsersPaystackSubaccountId,
     user?.id ? { userId: user.id } : "skip"
  );
  const paystackSubaccountId = typeof paystackSubaccountIdQuery === 'string' ? paystackSubaccountIdQuery : null;
  const idLoading = !!user?.id && paystackSubaccountIdQuery === undefined; // Loading for this specific query

  const [statusLoading, setStatusLoading] = useState(true); // For Paystack *status* API call
  const [statusError, setStatusError] = useState<string | null>(null);
  const [paystackStatus, setPaystackStatus] = useState<PaystackAccountStatus | null>(null);
  
  // Simulate initial load completion based on the paystackSubaccountIdQuery resolution
  useEffect(() => {
    if (!idLoading) {
        setInitialLoading(false);
        // Potentially set isFullyOnboarded based on a more complete query result here in the future
        // For now, we keep it false to show the stepper by default if not explicitly set.
    }
  }, [idLoading]);


  const isReadyToAcceptPayments = paystackStatus?.isActive && paystackStatus?.hasBankDetails;

  // Fetch Paystack *account status* if a subaccount ID exists
  useEffect(() => {
    const fetchStatus = async () => {
      if (paystackSubaccountId) { // Only fetch if there IS a subaccount ID
         console.log("Subaccount ID found, fetching Paystack status...", paystackSubaccountId);
         setStatusLoading(true);
         setStatusError(null);
         try {
           const result = await getPaystackSubaccountStatus(); // This action might need the subaccount ID in the future
           setPaystackStatus(result);
         } catch (err) {
           console.error("Failed to fetch Paystack status:", err);
           setStatusError(err instanceof Error ? err.message : "Could not fetch account status.");
           setPaystackStatus(null);
         } finally {
           setStatusLoading(false);
         }
       } else if (!idLoading) { // No subaccount ID, and the query for ID has resolved
         console.log("No Paystack subaccount linked for user, or query still loading for ID.");
         setPaystackStatus(null);
         setStatusLoading(false); // Not loading status if no ID to fetch for
         setStatusError(null);
       }
    };

     fetchStatus();
  }, [paystackSubaccountId, idLoading]); // Rerun when subaccount ID or its loading state changes

  const handleFullOnboardingComplete = () => {
    console.log("All onboarding steps completed! Refreshing or updating state...");
    // In a real app: Refetch Convex data for onboarding status or reload.
    // For simulation:
    setIsFullyOnboarded(true);
    setInitialLoading(false); // Ensure loading is false
    // Potentially trigger a refetch of paystackSubaccountId if it was set during onboarding
    // For now, if Paystack setup was the last step, its status will be fetched by the effect above.
  };

  // Show spinner during initial load (simulated or actual)
  if (initialLoading) {
    return <Spinner />;
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-8 min-h-screen">
      {/* Header Section - Always visible once not loading */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 px-6 py-8 text-white rounded-lg shadow-md">
          <h2 className="text-2xl font-bold">Seller Dashboard</h2>
          <p className="text-blue-100 mt-2">
            {isFullyOnboarded ? "Manage your events and payout settings" : "Complete your onboarding to get started"}
          </p>
      </div>

      {!isFullyOnboarded ? (
        <OrganizerOnboardingStepper onOnboardingComplete={handleFullOnboardingComplete} />
      ) : (
        <>
          {/* Create/View Events Section (Show only if ready and fully onboarded) */}
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
          {!isReadyToAcceptPayments && paystackSubaccountId && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-md shadow">
                <p className="text-yellow-700">Your payout account setup might be pending or require attention. Please check your Paystack dashboard.</p>
            </div>
          )}
           {!paystackSubaccountId && (
            <div className="bg-orange-50 border-l-4 border-orange-400 p-4 rounded-md shadow">
                <p className="text-orange-700">Your payout account is not yet linked. This might prevent you from creating events or receiving payments.</p>
                 {/* Optionally, you could offer a button here to re-trigger Paystack linking if something went wrong or if they skipped it */}
            </div>
           )}

          {/* Payout Status Section (Show only if fully onboarded and subaccount ID exists) */}
          {paystackSubaccountId && (
            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
              {statusLoading && <Spinner />}
              {!statusLoading && statusError && (
                 <p className="text-red-600 text-center">Error loading payout status: {statusError}</p>
              )}
              {!statusLoading && !statusError && paystackStatus && (
                <PayoutAccountStatusDisplay status={paystackStatus} />
              )}
              {!statusLoading && !statusError && !paystackStatus && (
                 <p className="text-center text-gray-500">Could not retrieve payout status details at the moment.</p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
