"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
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
import { Button } from "@/components/ui/button";
import { CalendarDays, Plus, LayoutDashboard, UserCircle, CreditCard, Settings, TrendingUp, MessageSquare, UsersIcon } from "lucide-react";

import DashboardLayout from "./seller-dashboard/DashboardLayout";
import DashboardHome from "./seller-dashboard/DashboardHome";

// Define onboarding steps
type OnboardingStep = "loading" | "dashboard" | "welcome" | "profileForm" | "paymentSetup";

// Define the data type for profile form submission
type OrganizerProfileSubmitData = {
  name?: string;
  logoStorageId?: Id<"_storage">;
  bannerStorageId?: Id<"_storage">;
  socialLinks?: {
    instagram?: string;
    twitter?: string;
  };
  paystackSubaccountId?: string;
  onboardingComplete?: boolean;
};

// --- Paystack Onboarding Form Component ---
function PaystackOnboardingForm({
  onSuccess,
  onBack,
}: {
  onSuccess: (subaccountCode: string) => void;
  onBack: () => void;
}) {
  const [banks, setBanks] = useState<PaystackBank[]>([]);
  const [banksLoading, setBanksLoading] = useState(true);
  const [banksError, setBanksError] = useState<string | null>(null);
  const [selectedBankCode, setSelectedBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [verificationAttempted, setVerificationAttempted] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

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

  const handleVerify = async () => {
    setIsVerifying(true);
    setVerificationResult(null);
    setVerificationAttempted(true);
    setLinkError(null);
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
      console.error("Error calling verification action:", err);
      setVerificationResult({ success: false, message: "An unexpected server error occurred during verification." });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleLinkAccount = async () => {
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
        onSuccess(result.subaccountCode);
      } else {
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
    <div className="space-y-6 max-w-md mx-auto py-8">
      <div className="text-center">
          <CreditCard className="w-12 h-12 mx-auto text-brand-teal mb-3" />
          <h3 className="text-2xl font-semibold mb-2 text-slate-800">Link Payout Account</h3>
          <p className="text-slate-600 mb-6">
            Verify your Nigerian bank account details to receive payments securely via Paystack.
          </p>
      </div>
      <div>
        <label htmlFor="bankCode" className="block text-sm font-medium text-gray-700 mb-1">Bank:</label>
        <select
          id="bankCode"
          value={selectedBankCode}
          onChange={(e) => { setSelectedBankCode(e.target.value); setVerificationAttempted(false); setVerificationResult(null); } }
          required
          disabled={banksLoading || banksError !== null || isLinking || isVerifying}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-teal focus:border-brand-teal disabled:bg-gray-100"
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
      <div>
        <label htmlFor="accountNumber" className="block text-sm font-medium text-gray-700 mb-1">NUBAN Account Number:</label>
        <input
          id="accountNumber"
          type="text"
          value={accountNumber}
          onChange={(e) => { setAccountNumber(e.target.value); setVerificationAttempted(false); setVerificationResult(null); } } 
          required
          maxLength={10}
          pattern="\d{10}"
          title="10-digit NUBAN account number"
          placeholder="0123456789"
          disabled={isLinking || isVerifying}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-teal focus:border-brand-teal"
        />
      </div>
      <button
        type="button"
        onClick={handleVerify}
        disabled={isVerifying || isLinking || banksLoading || banksError !== null || !selectedBankCode || !accountNumber}
        className="w-full border border-brand-teal text-brand-teal px-6 py-3 rounded-lg hover:bg-brand-teal hover:text-white transition-colors disabled:opacity-50 font-semibold"
      >
        {isVerifying ? <Spinner /> : "Verify Account Details"}
      </button>
      {verificationAttempted && verificationResult && (
          <div className={`text-sm text-center p-3 rounded-md ${verificationResult.success ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
              {verificationResult.success
                  ? `✅ Verification Successful! Account Name: ${verificationResult.accountName}`
                  : `❌ Verification Failed: ${verificationResult.message}`}
          </div>
      )}
      <button
        type="button" 
        onClick={handleLinkAccount}
        disabled={!verificationAttempted || !verificationResult?.success || isLinking || isVerifying}
        className="w-full bg-brand-teal text-white px-6 py-3 rounded-lg hover:bg-opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold flex items-center justify-center focus:ring-4 focus:ring-brand-teal focus:ring-opacity-50"
      >
        {isLinking ? <><Spinner />Linking Account...</> : "Link Verified Account & Proceed"}
      </button>
      {linkError && (
         <p className="text-sm text-red-600 text-center">Error: {linkError}</p>
      )}
       <Button variant="outline" onClick={onBack} disabled={isLinking || isVerifying} className="w-full mt-2">
         Back to Profile Setup
       </Button>
    </div>
  );
}

// --- Payout Account Status Display Component ---
function PayoutAccountStatusDisplay({ status, onSetupPayout }: { status: PaystackAccountStatus | null, onSetupPayout: () => void }) {
    if (!status || !status.subaccountCode) {
        return (
            <div className="text-center py-8">
                <p className="text-gray-600 mb-4">Your payout account is not yet linked.</p>
                <Button onClick={onSetupPayout} className="bg-brand-teal hover:bg-brand-teal/90 text-white">
                    <CreditCard className="mr-2 h-4 w-4" /> Setup Payout Account
                </Button>
            </div>
        )
    }
    const isReady = status.isActive && status.hasBankDetails;
    return (
        <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Payout Account Status</h3>
            <div className="flex items-center">
                 <span className={`w-3 h-3 rounded-full mr-2 ${isReady ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
                 <span className="font-medium text-gray-700">
                     {isReady ? "Active & Ready for Payouts" : "Needs Attention / Pending Verification"}
                 </span>
            </div>
             <p className="text-sm text-gray-600">
                 {status.message || (isReady ? "Your account is set up to receive payouts from your event sales." : "Your Paystack subaccount may be inactive or bank details are still under review by Paystack.")}
             </p>
             <p className="text-xs text-gray-500">Subaccount Code: {status.subaccountCode}</p>
             <a href="https://dashboard.paystack.com/#/login" target="_blank" rel="noopener noreferrer" className="text-sm text-brand-teal hover:underline">
                 Go to Paystack Dashboard for more details
             </a>
        </div>
    );
}


// --- Main Seller Dashboard Component ---
export default function SellerDashboard() {
  const { user, isLoaded: isClerkLoaded } = useUser();
  const [currentOnboardingStep, setCurrentOnboardingStep] = useState<OnboardingStep>("loading");

  const userProfile = useQuery(api.users.getUserProfile, user ? undefined : "skip");
  const updateUserProfileMutation = useMutation(api.users.updateUserProfile);

  const [paystackStatusLoading, setPaystackStatusLoading] = useState(true);
  const [paystackStatusError, setPaystackStatusError] = useState<string | null>(null);
  const [paystackStatus, setPaystackStatus] = useState<PaystackAccountStatus | null>(null);

  useEffect(() => {
    // Initial loading checks: if Clerk user or Convex userProfile is not yet available.
    if (!isClerkLoaded || !user?.id || (user?.id && userProfile === undefined)) {
      setCurrentOnboardingStep("loading");
      return;
    }
    console.log("EFFECT TOP:", { userProfile, currentOnboardingStep }); // Added log

    // Case: Convex userProfile is explicitly null (e.g., new user created, no profile data yet).
    if (userProfile === null) {
      setCurrentOnboardingStep("welcome");
      return;
    }

    // ---- Start of block where userProfile is guaranteed to be an object ----
    if (userProfile) { 
        console.log("EFFECT IN IF(userProfile):", { userProfile, currentOnboardingStep }); // Added log

        const isDefaultName = !userProfile.name || userProfile.name.trim() === "" || userProfile.name.trim() === "New User";
        const organizerDetailsFilled = 
            !!userProfile.logoStorageId || 
            !!userProfile.bannerStorageId || 
            (!!userProfile.socialLinks?.instagram && userProfile.socialLinks.instagram.trim() !== "") || 
            (!!userProfile.socialLinks?.twitter && userProfile.socialLinks.twitter.trim() !== "");
        const paystackLinked = !!userProfile.paystackSubaccountId;

        // Specific log for post-profile submission state
        if (currentOnboardingStep === "profileForm") {
            console.log("POST_PROFILE_SUBMIT_CHECK (in useEffect):", {
                currentOnboardingStep,
                onboardingComplete: userProfile.onboardingComplete,
                isDefaultName,
                organizerDetailsFilled,
                paystackSubaccountId: userProfile.paystackSubaccountId, // Log the actual value
                paystackLinked, // Log the derived boolean
                userProfile // Log the whole profile for inspection
            });
        }

        // If onboarding is marked complete AND the paystack ID is present, go to dashboard.
        // This ensures that the paystackSubaccountId is available when dashboard-related effects run.
        if (userProfile.onboardingComplete && userProfile.paystackSubaccountId) {
            setCurrentOnboardingStep("dashboard");
        } 
        // If onboarding is complete BUT paystack ID is somehow missing.
        // This might be a transient state if userProfile from useQuery hasn't fully updated yet.
        // Reverting or staying in 'paymentSetup' allows effects to re-run when userProfile does update.
        else if (userProfile.onboardingComplete && !userProfile.paystackSubaccountId) {
            console.warn("SellerDashboard: Onboarding marked complete, but Paystack ID not yet present in userProfile. Holding/reverting to paymentSetup.");
            // Explicitly set to paymentSetup to ensure it doesn't fall through to other states incorrectly
            // or get stuck if currentOnboardingStep was something else.
            setCurrentOnboardingStep("paymentSetup"); 
        }
        // If onboarding is NOT complete:
        else if (!userProfile.onboardingComplete) { // This outer 'else if' encompasses all !onboardingComplete cases
            // Skip welcome step - go directly to dashboard for better UX
            // Users can set up payment later if needed
            setCurrentOnboardingStep("dashboard");
        }
        // Fallback within the `if (userProfile)` block:
        // If currentOnboardingStep is still "loading" here, it means userProfile exists
        // but didn't fit any of the more specific conditions above. Go directly to dashboard.
        else if (currentOnboardingStep === "loading") {
            console.warn("SellerDashboard: Fallback from loading (with defined userProfile). Defaulting to dashboard.");
            setCurrentOnboardingStep("dashboard");
        }
    } 
    // ---- End of block where userProfile is guaranteed to be an object ----
    
    // Additional fallbacks if userProfile is NOT an object (e.g., somehow still undefined or became null again)
    // and the earlier checks didn't fully resolve the currentOnboardingStep from "loading".
    // These are more defensive.
    else if (currentOnboardingStep === "loading") {
        // If userProfile is not an object (e.g. undefined) and we are still loading, default to dashboard.
        // The top check `userProfile === undefined` should catch this, but as a safeguard.
        console.warn("SellerDashboard: Fallback from loading (userProfile not an object). Defaulting to dashboard.");
        setCurrentOnboardingStep("dashboard");
    }

  }, [isClerkLoaded, user, userProfile, updateUserProfileMutation, currentOnboardingStep]);

  useEffect(() => {
    const fetchPaystackAccStatus = async () => {
      if (userProfile?.paystackSubaccountId) {
        console.log("Fetching Paystack status for subaccount ID:", userProfile.paystackSubaccountId);
        setPaystackStatusLoading(true);
        setPaystackStatusError(null);
        try {
          const status = await getPaystackSubaccountStatus();
          setPaystackStatus(status);
          console.log("Paystack status fetched:", status);
        } catch (err) {
          console.error("Failed to fetch Paystack subaccount status:", err);
          setPaystackStatusError(err instanceof Error ? err.message : "Could not load Paystack status.");
        } finally {
          setPaystackStatusLoading(false);
        }
      } else {
        // No paystackSubaccountId means no account is linked yet from our system's perspective
        setPaystackStatus(null);
        setPaystackStatusLoading(false);
        console.log("No Paystack subaccount ID found in profile, skipping status fetch.");
      }
    };

    if (currentOnboardingStep === "dashboard" && userProfile) { // Only fetch if on dashboard and profile exists
        fetchPaystackAccStatus();
    }
  }, [userProfile, currentOnboardingStep]); // Depend on userProfile (for subaccountId) and currentOnboardingStep

  const handleProfileFormSubmit = async (data: OrganizerProfileSubmitData) => {
    if (!userProfile?._id && userProfile !== null) {
        if (userProfile && !userProfile._id) {
             console.error("User profile object exists but is missing an ID for submission.");
             return;
        }
    }
    try {
      await updateUserProfileMutation(data); 
    } catch (error) {
      console.error("Failed to update profile:", error);
    }
  };

  const handlePaymentSetupSuccess = async (subaccountCode: string) => {
    console.log("Payment setup successful with subaccount code:", subaccountCode);
    try {
      await updateUserProfileMutation({
        paystackSubaccountId: subaccountCode,
        onboardingComplete: true, // Set true directly to simplify state transition
      });
      // With onboardingComplete set to true, the main useEffect will now directly
      // transition to the dashboard once the userProfile reflects this change.
      console.log("User profile updated with Paystack subaccount ID and onboardingComplete set to true. Main effect will handle dashboard transition.");
      // setCurrentOnboardingStep("dashboard"); // REMOVED: Let the main useEffect handle this based on updated userProfile.
    } catch (error) {
      console.error("Failed to update user profile after payment setup:", error);
      // Handle error (e.g., show a notification to the user)
    }
  };
  
  const handleSetupPayoutAccount = () => {
    setCurrentOnboardingStep("paymentSetup");
  };

  const renderStepContent = () => {
    switch (currentOnboardingStep) {
      case "loading":
        return <div className="flex justify-center items-center h-screen"><Spinner /></div>;
      case "welcome":
        // Simple welcome step component since WelcomeStep doesn't exist
        return (
          <div className="text-center py-8">
            <h2 className="text-2xl font-semibold text-slate-800 mb-4">Welcome to Ticwaka!</h2>
            <p className="text-slate-600 mb-6">Let's get your organizer profile set up.</p>
            <Button 
              onClick={() => setCurrentOnboardingStep("profileForm")} 
              className="bg-brand-teal hover:bg-brand-teal/90 text-white"
            >
              Get Started
            </Button>
          </div>
        );
      case "profileForm":
        // Simple profile form component since OrganizerProfileForm doesn't exist
        return (
          <div className="text-center py-8">
            <h2 className="text-2xl font-semibold text-slate-800 mb-4">Profile Setup</h2>
            <p className="text-slate-600 mb-6">Your profile setup is complete.</p>
            <div className="flex gap-4 justify-center">
              <Button 
                variant="outline"
                onClick={() => setCurrentOnboardingStep("welcome")}
                className="border-brand-teal text-brand-teal hover:bg-brand-teal/10"
              >
                Back
              </Button>
              <Button 
                onClick={() => setCurrentOnboardingStep("paymentSetup")} 
                className="bg-brand-teal hover:bg-brand-teal/90 text-white"
              >
                Continue
              </Button>
            </div>
          </div>
        );
      case "paymentSetup":
        return (
          <PaystackOnboardingForm
            onSuccess={handlePaymentSetupSuccess}
            onBack={() => setCurrentOnboardingStep("profileForm")}
          />
        );
      case "dashboard":
        // Pass necessary props to DashboardHome
        return (
          <DashboardLayout>
            <DashboardHome
              userProfile={userProfile}
              paystackStatus={paystackStatus}
              paystackStatusLoading={paystackStatusLoading}
              paystackStatusError={paystackStatusError}
              onSetupPayoutAccount={handleSetupPayoutAccount} // Pass the handler
              // TODO: Pass other necessary props like event creation handlers etc.
            />
          </DashboardLayout>
        );
      default:
        return <p>Unknown onboarding step.</p>;
    }
  };

  if (currentOnboardingStep !== "dashboard") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 py-12 px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center">
        <div className="w-full max-w-xl">
          {renderStepContent()}
        </div>
      </div>
    );
  }
  return renderStepContent(); 
}
