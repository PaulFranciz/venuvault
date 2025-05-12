'use client';

import { useState, useEffect } from "react";
import {
  createOrUpdatePaystackSubaccount
} from "@/app/actions/createPaystackSubaccount";
import {
  getPaystackBankList, 
  PaystackBank
} from "@/app/actions/getPaystackBankList";
import {
   verifyPaystackBankAccount,
   VerificationResult
} from "@/app/actions/verifyPaystackBankAccount";

// --- Paystack Onboarding Form Component --- 
export default function PaystackOnboardingForm({
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
        // Should be caught by the action\'s error handling, but belt-and-suspenders
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