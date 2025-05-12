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
  const { user, isLoaded: isClerkLoaded } = useUser();
  
  // Fetch comprehensive onboarding details from Convex
  // The query will return null if user is not authenticated or not found, 
  // or an object with onboarding flags.
  const onboardingDetails = useQuery(
    api.users.getOrganizerOnboardingDetails, 
    !isClerkLoaded || !user ? "skip" : {} // Call with empty args if user is loaded, else skip
  );

  // Loading state: true if Clerk is loading OR if Clerk is loaded but Convex query hasn't returned yet.
  const isLoading = !isClerkLoaded || (isClerkLoaded && user && onboardingDetails === undefined);

  // Derived states from onboardingDetails
  const isFullyOnboarded = onboardingDetails?.isFullyOnboarded ?? false;
  const paystackSubaccountId = onboardingDetails?.paystackSubaccountId ?? null;
  // const organizerName = onboardingDetails?.organizerName ?? "Organizer"; // Example if needed

  const [statusLoading, setStatusLoading] = useState(true); // For Paystack *status* API call
  const [statusError, setStatusError] = useState<string | null>(null);
  const [paystackStatus, setPaystackStatus] = useState<PaystackAccountStatus | null>(null);
  
  const isReadyToAcceptPayments = paystackStatus?.isActive && paystackStatus?.hasBankDetails;

  // Fetch Paystack *account status* if a subaccount ID exists from onboardingDetails
  useEffect(() => {
    const fetchStatus = async () => {
      if (paystackSubaccountId) { 
         console.log("Subaccount ID found from Convex, fetching Paystack API status...", paystackSubaccountId);
         setStatusLoading(true);
         setStatusError(null);
         try {
           // Assuming getPaystackSubaccountStatus might implicitly use the user's session
           // or you might need to pass paystackSubaccountId if the action requires it.
           const result = await getPaystackSubaccountStatus(); 
           setPaystackStatus(result);
         } catch (err) {
           console.error("Failed to fetch Paystack status:", err);
           setStatusError(err instanceof Error ? err.message : "Could not fetch account status.");
           setPaystackStatus(null);
         } finally {
           setStatusLoading(false);
         }
       } else if (onboardingDetails !== undefined) { // Query has resolved, but no subaccount ID
         console.log("No Paystack subaccount linked for user according to Convex data.");
         setPaystackStatus(null);
         setStatusLoading(false); 
         setStatusError(null);
       }
    };

    // Only run if onboardingDetails has loaded (is not undefined)
    if (onboardingDetails !== undefined) {
      fetchStatus();
    }
  }, [paystackSubaccountId, onboardingDetails]); // Rerun when subaccount ID or details change

  const handleFullOnboardingComplete = () => {
    console.log("All onboarding steps reported complete by stepper! Data should refetch.");
    // Convex useQuery should ideally handle refetching automatically when the underlying data 
    // (updated by mutations called from OrganizerInfoForm/Paystack actions) changes.
    // If not, a window.location.reload() is a simpler way to ensure fresh data:
    // window.location.reload(); 
    // Or, you can try to manually trigger a refetch if Convex provides such a mechanism for useQuery (less common).
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner />
      </div>
    );
  }
  
  // If Clerk is loaded but there's no user (e.g., logged out, but tried to access /seller)
  // This should ideally be caught by page-level auth guards in Next.js (e.g., in page.tsx)
  if (isClerkLoaded && !user) {
      return (
        <div className="min-h-screen flex items-center justify-center">
            <p>Please sign in to access the seller dashboard.</p>
            {/* Optionally, redirect or show a sign-in button */}
        </div>
      );
  }
  
  // If onboardingDetails is null after loading (and user exists), it might mean an issue with fetching or user not in DB
  if (user && onboardingDetails === null && !isLoading) {
      return (
          <div className="min-h-screen flex items-center justify-center p-4 text-center">
              <p className="text-red-600">
                  Could not load your organizer details. Your profile might not be fully set up in our system yet, or there was an issue fetching your data. Please try refreshing, or contact support if the issue persists.
              </p>
          </div>
      );
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
        // Pass a key that changes when onboardingDetails changes to ensure stepper re-evaluates if necessary,
        // though internal state of stepper should manage its current step.
        <OrganizerOnboardingStepper key={onboardingDetails ? 'stepper-loaded' : 'stepper-initial'} onOnboardingComplete={handleFullOnboardingComplete} />
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
                <p className="text-yellow-700">Your payout account setup with Paystack might be pending or require attention to start receiving payments. Please check your Paystack dashboard or complete any pending verifications.</p>
            </div>
          )}
           {!paystackSubaccountId && (
            <div className="bg-orange-50 border-l-4 border-orange-400 p-4 rounded-md shadow">
                <p className="text-orange-700">Your payout account is not yet linked. Please complete this step to enable event creation and payments.</p>
            </div>
           )}

          {/* Payout Status Section (Show only if fully onboarded and subaccount ID exists) */}
          {paystackSubaccountId && (
            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
              {statusLoading && <Spinner />}
              {!statusLoading && statusError && (
                 <p className="text-red-600 text-center">Error loading Paystack account status: {statusError}</p>
              )}
              {!statusLoading && !statusError && paystackStatus && (
                <PayoutAccountStatusDisplay status={paystackStatus} />
              )}
              {!statusLoading && !statusError && !paystackStatus && (
                 <p className="text-center text-gray-500">Could not retrieve Paystack account status details at the moment.</p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
