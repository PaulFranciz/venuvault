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
import WelcomeStep from "@/components/seller-onboarding/WelcomeStep";
import OrganizerProfileForm, { OrganizerProfileSubmitData } from "@/components/seller-onboarding/OrganizerProfileForm";
import DashboardLayout from "./seller-dashboard/DashboardLayout";
import DashboardHome from "./seller-dashboard/DashboardHome";

// Define onboarding steps
type OnboardingStep = "loading" | "welcome" | "profileForm" | "paymentSetup" | "dashboard";

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
function PayoutAccountStatusDisplay({ status }: { status: PaystackAccountStatus }) {
    if (!status || !status.subaccountCode) {
        return (
             <p className="text-center text-gray-500">Payout account not linked.</p>
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

        if (userProfile.onboardingComplete) {
            setCurrentOnboardingStep("dashboard");
        } 
        // If onboarding is NOT complete:
        else if ((isDefaultName || !organizerDetailsFilled) && !paystackLinked) {
             // If user explicitly navigated to profileForm (current step), don't push them back to welcome.
            if (currentOnboardingStep !== "profileForm") {
                 setCurrentOnboardingStep("welcome");
            }
        }
        else if (!isDefaultName && organizerDetailsFilled && !paystackLinked) {
            // Name is NOT default, AND organizer details ARE filled, BUT Paystack is NOT linked.
            setCurrentOnboardingStep("paymentSetup");
        }
        else if (paystackLinked && !userProfile.onboardingComplete) { 
            // Name, organizer details, and Paystack are present, but onboardingComplete is false.
            console.log("Profile, details, and Paystack complete, but onboarding flag false. Setting flag.");
            updateUserProfileMutation({ onboardingComplete: true })
                .then(() => {
                    setCurrentOnboardingStep("dashboard");
                })
                .catch(error => {
                    console.error("Error auto-marking onboarding complete:", error);
                    setCurrentOnboardingStep("paymentSetup"); // Fallback
                });
        }
        // Fallback within the `if (userProfile)` block:
        // If currentOnboardingStep is still "loading" here, it means userProfile exists
        // but didn't fit any of the more specific conditions above. Safest to go to welcome.
        else if (currentOnboardingStep === "loading") {
            console.warn("SellerDashboard: Fallback from loading (with defined userProfile). Defaulting to welcome.");
            setCurrentOnboardingStep("welcome");
        }
    } 
    // ---- End of block where userProfile is guaranteed to be an object ----
    
    // Additional fallbacks if userProfile is NOT an object (e.g., somehow still undefined or became null again)
    // and the earlier checks didn't fully resolve the currentOnboardingStep from "loading".
    // These are more defensive.
    else if (currentOnboardingStep === "loading") {
        // If userProfile is not an object (e.g. undefined) and we are still loading, default to welcome.
        // The top check `userProfile === undefined` should catch this, but as a safeguard.
        console.warn("SellerDashboard: Fallback from loading (userProfile not an object). Defaulting to welcome.");
        setCurrentOnboardingStep("welcome");
    }

  }, [isClerkLoaded, user, userProfile, updateUserProfileMutation, currentOnboardingStep]);

  useEffect(() => {
    const fetchPaystackAccStatus = async () => {
      if (userProfile?.paystackSubaccountId) {
        setPaystackStatusLoading(true);
        setPaystackStatusError(null);
        try {
          const result = await getPaystackSubaccountStatus(); 
          setPaystackStatus(result);
        } catch (err) {
          console.error("Failed to fetch Paystack status:", err);
          setPaystackStatusError(err instanceof Error ? err.message : "Could not fetch account status.");
          setPaystackStatus(null);
        } finally {
          setPaystackStatusLoading(false);
        }
      } else {
        setPaystackStatus(null);
        setPaystackStatusLoading(false);
        setPaystackStatusError(null);
      }
    };

    if (userProfile) { 
        fetchPaystackAccStatus();
    } else if (userProfile === null) {
        setPaystackStatus(null);
        setPaystackStatusLoading(false);
        setPaystackStatusError(null);
    }
  }, [userProfile]);

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
    try {
      await updateUserProfileMutation({
        onboardingComplete: true,
        paystackSubaccountId: subaccountCode,
      });
    } catch (error) {
      console.error("Failed to mark onboarding as complete and set Paystack ID:", error);
    }
  };

  if (!isClerkLoaded || currentOnboardingStep === "loading" || (user?.id && userProfile === undefined) ) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50"><Spinner /></div>
    );
  }

  const renderStepContent = () => {
    switch (currentOnboardingStep) {
      case "welcome":
        return <WelcomeStep onNext={() => setCurrentOnboardingStep("profileForm")} />;
      case "profileForm":
        return (
          <OrganizerProfileForm
            onSubmit={handleProfileFormSubmit}
            initialData={{
                name: userProfile?.name,
                logoStorageId: userProfile?.logoStorageId as Id<"_storage"> | undefined,
                bannerStorageId: userProfile?.bannerStorageId as Id<"_storage"> | undefined,
                socialLinks: userProfile?.socialLinks as { instagram?: string, twitter?: string} | undefined,
            }}
            onBack={() => setCurrentOnboardingStep("welcome")} 
          />
        );
      case "paymentSetup":
        return (
          <div className="bg-white p-6 sm:p-8 rounded-lg shadow-xl border border-gray-200">
            <PaystackOnboardingForm
              onSuccess={handlePaymentSetupSuccess}
              onBack={() => setCurrentOnboardingStep("profileForm")}
            />
          </div>
        );
      case "dashboard":
        const isPaystackReady = paystackStatus?.isActive && paystackStatus?.hasBankDetails;
        return (
          <div className="flex min-h-screen"> 
            <aside className="w-20 md:w-64 bg-slate-900 text-slate-200 p-4 md:p-6 space-y-6 shadow-lg flex flex-col">
              <div className="text-xl md:text-2xl font-bold text-white text-center md:text-left">
                <Link href="/seller">E<span className="hidden md:inline">vent</span>P<span className="hidden md:inline">ulse</span></Link>
              </div>
              <nav className="space-y-1 md:space-y-2 flex-grow">
                {[ 
                  { href: "/seller", icon: LayoutDashboard, label: "Dashboard" },
                  { href: "/seller/events", icon: CalendarDays, label: "Events" },
                  { href: "/seller/new-event", icon: Plus, label: "New Event" },
                  { href: "/seller/analytics", icon: TrendingUp, label: "Analytics" },
                  { href: "/seller/communication", icon: MessageSquare, label: "Messages" },
                  { href: "/seller/staff", icon: UsersIcon, label: "Staff" },
                ].map(item => (
                    <Link key={item.href} href={item.href} title={item.label} className="flex items-center gap-2 md:gap-3 px-2 py-2 md:px-3 md:py-2.5 rounded-md text-sm hover:bg-slate-700 hover:text-white transition-colors">
                    <item.icon className="w-5 h-5 md:w-5 md:h-5 flex-shrink-0" /> <span className="hidden md:inline">{item.label}</span>
                    </Link>
                ))}
              </nav>
              <div className="mt-auto border-t border-slate-700 pt-4 space-y-1 md:space-y-2">
                 <Link href="/seller/profile" title="Organizer Profile" className="flex items-center gap-2 md:gap-3 px-2 py-2 md:px-3 md:py-2.5 rounded-md text-sm hover:bg-slate-700 hover:text-white transition-colors">
                    <UserCircle className="w-5 h-5 md:w-5 md:h-5 flex-shrink-0" /> <span className="hidden md:inline">Profile</span>
                </Link>
                <Link href="/seller/settings" title="Settings" className="flex items-center gap-2 md:gap-3 px-2 py-2 md:px-3 md:py-2.5 rounded-md text-sm hover:bg-slate-700 hover:text-white transition-colors">
                    <Settings className="w-5 h-5 md:w-5 md:h-5 flex-shrink-0" /> <span className="hidden md:inline">Settings</span>
                </Link>
              </div>
            </aside>

            <main className="flex-1 p-4 sm:p-6 md:p-10 space-y-8 bg-slate-100 overflow-y-auto">
              <div className="bg-gradient-to-r from-brand-teal to-teal-700 px-6 py-8 text-white rounded-xl shadow-lg">
                <h1 className="text-2xl sm:text-3xl font-bold">Seller Dashboard</h1>
                <p className="text-blue-100 mt-1 sm:mt-2">
                  Welcome back, {userProfile?.name || user?.firstName || 'Seller'}! Here's an overview of your activities.
                </p>
              </div>

              {userProfile?.paystackSubaccountId && !paystackStatusLoading && paystackStatus && (
                  <PayoutAccountStatusDisplay status={paystackStatus} />
              )}
               {userProfile?.paystackSubaccountId && paystackStatusLoading && <div className="flex justify-center"><Spinner /></div>}
               {userProfile?.paystackSubaccountId && !paystackStatusLoading && paystackStatusError && (
                 <p className="text-red-600 text-center bg-red-50 p-3 rounded-md">Error loading payout status: {paystackStatusError}</p>
               )}
              
              {!userProfile?.paystackSubaccountId && currentOnboardingStep === 'dashboard' && (
                  <div className="bg-yellow-50 border border-yellow-300 text-yellow-800 p-4 rounded-lg shadow-md">
                    <h4 className="font-semibold text-yellow-900">Complete Your Setup</h4>
                    <p>Please link your Paystack account to activate event creation and ticket sales.</p>
                    <Button onClick={() => setCurrentOnboardingStep('paymentSetup')} className="mt-3 bg-brand-teal hover:bg-opacity-90 text-white focus:ring-4 focus:ring-brand-teal focus:ring-opacity-50">
                        Setup Payout Account
                    </Button>
                  </div>
               )}

                {/* Placeholder for Dashboard Widgets: Event Management, Ticketing, Analytics etc. */} 
                {isPaystackReady && (
                     <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                        <h3 className="text-xl font-semibold text-gray-900 mb-6">Quick Actions</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            <Link href="/seller/new-event" className="block p-4 bg-brand-teal text-white rounded-lg hover:bg-opacity-90 transition-colors text-center shadow-sm">
                                <Plus className="w-6 h-6 mx-auto mb-2" /> Create New Event
                            </Link>
                            <Link href="/seller/events" className="block p-4 bg-slate-500 text-white rounded-lg hover:bg-slate-600 transition-colors text-center shadow-sm">
                                <CalendarDays className="w-6 h-6 mx-auto mb-2" /> View My Events
                            </Link>
                             <Link href="/seller/analytics" className="block p-4 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-center shadow-sm">
                                <TrendingUp className="w-6 h-6 mx-auto mb-2" /> View Analytics
                            </Link>
                        </div>
                    </div>
                )}

                 <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200"><h4 className="font-semibold text-gray-700 mb-2">Total Gross Revenue</h4><p className="text-3xl font-bold text-gray-900">N0.00</p><p className="text-sm text-gray-500">All time</p></div>
                    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200"><h4 className="font-semibold text-gray-700 mb-2">Active Events</h4><p className="text-3xl font-bold text-gray-900">0</p><Link href="/seller/events" className="text-sm text-brand-teal hover:underline">Manage events</Link></div>
                    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200"><h4 className="font-semibold text-gray-700 mb-2">Tickets Sold (Last 30d)</h4><p className="text-3xl font-bold text-gray-900">0</p><Link href="/seller/analytics" className="text-sm text-brand-teal hover:underline">View sales report</Link></div>
                 </div>
            </main>
          </div>
        );
      default:
        return <div className="min-h-screen flex items-center justify-center text-red-500">Error: Unknown onboarding step ({currentOnboardingStep}).</div>;
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
