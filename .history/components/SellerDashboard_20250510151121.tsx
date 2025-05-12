"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { createOrUpdatePaystackSubaccount } from "@/app/actions/createPaystackSubaccount";
import {
  getPaystackSubaccountStatus,
  PaystackAccountStatus,
} from "@/app/actions/getPaystackSubaccountStatus";
import { getPaystackBankList, PaystackBank } from "@/app/actions/getPaystackBankList";
import {
   verifyPaystackBankAccount,
   VerificationResult
} from "@/app/actions/verifyPaystackBankAccount";
import Spinner from "./Spinner";
import { CalendarDays, Plus } from "lucide-react";

// --- Paystack Onboarding Form Component --- (Updated for two-step process)
function PaystackOnboardingForm({
  onSuccess,
}: {
  onSuccess: () => void;
}) {
  // Bank list state
  const [banks, setBanks] = useState<PaystackBank[]>([]);
  const [banksLoading, setBanksLoading] = useState(true);
  const [banksError, setBanksError] = useState<string | null>(null);

  // Form input state
  const [selectedBankCode, setSelectedBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");

  // Verification state
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [verificationAttempted, setVerificationAttempted] = useState(false);

  // Linking state
  const [isLinking, setIsLinking] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  // Fetch bank list
  useEffect(() => {
    const fetchBanks = async () => {
      setBanksLoading(true);
      setBanksError(null);
      try {
        const bankList = await getPaystackBankList();
        setBanks(bankList);
      } catch (err) {
        console.error("Failed to fetch Paystack banks:", err);
        setBanksError(
          err instanceof Error ? err.message : "Could not load bank list."
        );
      }
      setBanksLoading(false);
    };
    fetchBanks();
  }, []);

  // Handle VERIFY button click
  const handleVerify = async () => {
    setIsVerifying(true);
    setVerificationResult(null);
    setVerificationAttempted(true);
    setLinkError(null); // Clear previous link error if re-verifying

    if (!selectedBankCode || !accountNumber) {
        setVerificationResult({ success: false, message: "Bank and account number are required." });
        setIsVerifying(false);
        return;
    }
     if (!/^\d{10}$/.test(accountNumber)) {
        setVerificationResult({ success: false, message: "Please enter a valid 10-digit NUBAN account number." });
        setIsVerifying(false);
        return;
    }

    try {
      const result = await verifyPaystackBankAccount({
        bankCode: selectedBankCode,
        accountNumber: accountNumber,
      });
      setVerificationResult(result);
    } catch (err) {
      // This catch is for unexpected errors during the action call itself
      console.error("Error calling verification action:", err);
      setVerificationResult({ success: false, message: "An unexpected server error occurred during verification." });
    } finally {
      setIsVerifying(false);
    }
  };

  // Handle LINK ACCOUNT button click
  const handleLinkAccount = async () => {
    // Should only be clickable if verification was successful
    if (!verificationResult?.success || !selectedBankCode || !accountNumber) {
        setLinkError("Verification must succeed before linking.");
        return;
    }

    setIsLinking(true);
    setLinkError(null);

    try {
      const result = await createOrUpdatePaystackSubaccount({
        bankCode: selectedBankCode,
        accountNumber: accountNumber,
      });

      if (result?.subaccountCode) {
        onSuccess(); // Trigger refresh in parent dashboard
      } else {
        // Should be caught by the action's error handling, but belt-and-suspenders
        throw new Error("Failed to link payout account.");
      }
    } catch (err) {
      console.error("Paystack subaccount link/create failed:", err);
      setLinkError(err instanceof Error ? err.message : "An unknown error occurred during linking.");
    } finally {
      setIsLinking(false);
    }
  };

  return (
    <div className="space-y-6 max-w-md mx-auto">
      <h3 className="text-xl font-semibold mb-4 text-center">Link Payout Account</h3>
      <p className="text-gray-600 mb-6 text-center">
        Verify your Nigerian bank account details to receive payments via Paystack.
      </p>

      {/* Bank Selection */}
      <div>
        <label htmlFor="bankCode" className="block text-sm font-medium text-gray-700 mb-1">Bank:</label>
        <select
          id="bankCode"
          value={selectedBankCode}
          onChange={(e) => { setSelectedBankCode(e.target.value); setVerificationAttempted(false); setVerificationResult(null); } } // Reset verification on change
          required
          disabled={banksLoading || banksError !== null}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
        >
          <option value="" disabled>
            {banksLoading ? "Loading banks..." : banksError ? "Error loading banks" : "-- Select Bank --"}
          </option>
          {!banksLoading && !banksError && banks.map((bank) => (
              <option key={bank.id} value={bank.code}>{bank.name}</option>
          ))}
        </select>
         {banksError && <p className="text-xs text-red-600 mt-1">Error: {banksError}</p>}
      </div>

      {/* Account Number Input */}
      <div>
        <label htmlFor="accountNumber" className="block text-sm font-medium text-gray-700 mb-1">NUBAN Account Number:</label>
        <input
          id="accountNumber"
          type="text"
          value={accountNumber}
          onChange={(e) => { setAccountNumber(e.target.value); setVerificationAttempted(false); setVerificationResult(null); } } // Reset verification on change
          required
          maxLength={10}
          pattern="\d{10}"
          title="10-digit NUBAN account number"
          placeholder="0123456789"
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Verify Button */}
      <button
        type="button" // Change type to button
        onClick={handleVerify}
        disabled={isVerifying || isLinking || banksLoading || banksError !== null || !selectedBankCode || !accountNumber}
        className="w-full bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
      >
        {isVerifying ? "Verifying..." : "Verify Account Details"}
      </button>

      {/* Verification Result Display */} 
      {verificationAttempted && verificationResult && (
          <div className={`text-sm text-center p-2 rounded ${verificationResult.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {verificationResult.success
                  ? `✅ Verification Successful! Account Name: ${verificationResult.accountName}`
                  : `❌ Verification Failed: ${verificationResult.message}`}
          </div>
      )}

       {/* Link Account Button - Conditionally Enabled */}
      <button
        type="button" // Change type to button
        onClick={handleLinkAccount}
        disabled={!verificationAttempted || !verificationResult?.success || isLinking || isVerifying}
        className="w-full bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLinking ? "Linking Account..." : "Link Verified Account"}
      </button>

      {/* Link Error Display */} 
      {linkError && (
         <p className="text-sm text-red-600 text-center">Error: {linkError}</p>
      )}

    </div>
  );
}

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

      {/* Removed old Stripe-specific buttons and logic */}

    </div>
  );
}
