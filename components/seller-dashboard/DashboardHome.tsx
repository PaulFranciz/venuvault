import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Plus, CalendarDays, TrendingUp, CreditCard } from 'lucide-react';
import Spinner from '@/components/Spinner';

// Assuming types are globally available or correctly pathed if not.
// Define simplified types here if not imported from a central file, for clarity during refactor.
export interface UserProfile {
  _id: string;
  userId: string;
  name?: string | null;
  email?: string | null;
  logoUrl?: string | null;
  bannerUrl?: string | null;
  logoStorageId?: string | null;
  bannerStorageId?: string | null;
  socialLinks?: { 
    instagram?: string | null;
    twitter?: string | null;
    facebook?: string | null;
    linkedin?: string | null;
    tiktok?: string | null;
    youtube?: string | null;
  } | null;
  bio?: string | null;
  onboardingComplete?: boolean | null;
  paystackSubaccountId?: string | null;
  // other fields from your Convex schema for users table
}

export interface PaystackAccountStatus {
  isActive: boolean;
  hasBankDetails: boolean;
  subaccountCode: string | null;
  accountName?: string | null; 
  bankName?: string | null;
  message?: string | null;
}

// --- PayoutAccountStatusDisplay Component (Copied and adapted) ---
interface PayoutAccountStatusDisplayProps {
  status: PaystackAccountStatus | null;
  onSetupPayout: () => void;
}

const PayoutAccountStatusDisplay: React.FC<PayoutAccountStatusDisplayProps> = ({ status, onSetupPayout }) => {
    if (!status || !status.subaccountCode) {
        return (
            <div className="text-center py-8 bg-white p-6 rounded-lg shadow-md border border-gray-200 my-6">
                <CreditCard className="w-12 h-12 mx-auto text-brand-teal mb-3" />
                <h4 className="font-pally-medium text-gray-800 text-lg mb-2">Link Your Payout Account</h4>
                <p className="text-gray-600 mb-4">Please link your Paystack account to activate event creation and ticket sales.</p>
                <Button onClick={onSetupPayout} className="bg-brand-teal hover:bg-brand-teal/90 text-white">
                    <CreditCard className="mr-2 h-4 w-4" /> Setup Payout Account
                </Button>
            </div>
        );
    }
    const isReady = status.isActive && status.hasBankDetails;
    return (
        <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm space-y-4 my-6">
            <h3 className="text-lg font-pally-medium text-gray-800 mb-3">Payout Account Status</h3>
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
             {isReady && status.accountName && status.bankName && (
                <p className="text-sm text-gray-600">Account: {status.accountName} - {status.bankName}</p>
             )}
             <a href="https://dashboard.paystack.com/#/login" target="_blank" rel="noopener noreferrer" className="text-sm text-brand-teal hover:underline">
                 Go to Paystack Dashboard for more details
             </a>
        </div>
    );
};
// --- End of PayoutAccountStatusDisplay Component ---

interface DashboardHomeProps {
  userProfile: UserProfile | null | undefined;
  paystackStatus: PaystackAccountStatus | null;
  paystackStatusLoading: boolean;
  paystackStatusError: string | null;
  onSetupPayoutAccount: () => void;
}

const DashboardHome: React.FC<DashboardHomeProps> = ({
  userProfile,
  paystackStatus,
  paystackStatusLoading,
  paystackStatusError,
  onSetupPayoutAccount
}) => {
  const userName = userProfile?.name || 'Seller';
  const isPaystackReady = paystackStatus?.isActive && paystackStatus?.hasBankDetails;

  return (
    <div className="space-y-8">
      <div className="bg-gradient-to-r from-brand-teal to-teal-700 px-6 py-8 text-white rounded-xl shadow-lg">
        <h1 className="text-2xl sm:text-3xl font-pally-bold">Seller Dashboard</h1>
        <p className="text-teal-100 mt-1 sm:mt-2">
          Welcome back, {userName}! Here's an overview of your activities.
        </p>
      </div>

      {/* Paystack Status Section (already correctly implemented) */}
      {paystackStatusLoading && (
        <div className="text-center py-8 bg-white p-6 rounded-lg shadow-md border border-gray-200 my-6">
          <Spinner />
        </div>
      )}
      {!paystackStatusLoading && paystackStatusError && (
        <div className="text-center py-8 bg-white p-6 rounded-lg shadow-md border border-gray-200 my-6">
          <p className="text-red-500">{paystackStatusError}</p>
        </div>
      )}
      {!paystackStatusLoading && !paystackStatusError && userProfile && (
        <PayoutAccountStatusDisplay
            status={userProfile.paystackSubaccountId ? { 
              isActive: paystackStatus?.isActive ?? false,
              hasBankDetails: paystackStatus?.hasBankDetails ?? false,
              subaccountCode: userProfile.paystackSubaccountId,
              accountName: paystackStatus?.accountName,
              bankName: paystackStatus?.bankName,
              message: paystackStatus?.message
            } : null} 
            onSetupPayout={onSetupPayoutAccount}
        />
      )}
      {/* End of Paystack Status Section */}

      {/* Quick Actions - Show only if Paystack is ready and onboarding is complete */}
      {isPaystackReady && userProfile?.onboardingComplete && (
          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <h3 className="text-xl font-pally-medium text-gray-900 mb-6">Quick Actions</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Link href="/seller/new-event" className="block p-4 bg-brand-teal text-white rounded-lg hover:bg-brand-teal/90 transition-colors text-center shadow-sm">
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

      {/* Placeholder Stats - Show if onboarding is complete */}
      {userProfile?.onboardingComplete && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                <h4 className="font-pally-medium text-gray-700 mb-2">Total Gross Revenue</h4>
                <p className="text-3xl font-pally-bold text-gray-900">N0.00</p>
                <p className="text-sm text-gray-500">All time</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                <h4 className="font-pally-medium text-gray-700 mb-2">Active Events</h4>
                <p className="text-3xl font-pally-bold text-gray-900">0</p>
                <Link href="/seller/events" className="text-sm text-brand-teal hover:underline">Manage events</Link>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                <h4 className="font-pally-medium text-gray-700 mb-2">Tickets Sold (Last 30d)</h4>
                <p className="text-3xl font-pally-bold text-gray-900">0</p>
                <Link href="/seller/analytics" className="text-sm text-brand-teal hover:underline">View sales report</Link>
            </div>
        </div>
      )}
      
       {/* Fallback for when onboarding might be complete but Paystack is not yet linked, or other states */}
       {!isPaystackReady && userProfile?.onboardingComplete && !paystackStatusLoading && !paystackStatusError && (
         <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 my-6">
            <div className="flex">
                <div className="py-1"><svg className="fill-current h-6 w-6 text-yellow-500 mr-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M2.93 17.07A10 10 0 1 1 17.07 2.93 10 10 0 0 1 2.93 17.07zM9 5v6h2V5H9zm0 8v2h2v-2H9z"/></svg></div>
                <div>
                    <p className="font-bold text-yellow-700">Action Required</p>
                    <p className="text-sm text-yellow-600">Your payout account setup is pending or requires attention. Please complete the setup to enable all seller features.</p>
                     <Button onClick={onSetupPayoutAccount} className="mt-3 bg-yellow-500 hover:bg-yellow-600 text-white text-sm py-2 px-3 rounded-md">
                        Complete Payout Setup
                    </Button>
                </div>
            </div>
        </div>
       )}
    </div>
  );
};

export default DashboardHome;