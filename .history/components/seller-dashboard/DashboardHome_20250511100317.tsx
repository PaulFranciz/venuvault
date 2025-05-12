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
  subaccountCode: string;
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
  // paystackStatus, // Will be used in next steps
  // paystackStatusLoading,
  // paystackStatusError,
  // onSetupPayoutAccount
}) => {
  const userName = userProfile?.name || 'Seller';

  return (
    <div className="space-y-8">
      <div className="bg-gradient-to-r from-brand-teal to-teal-700 px-6 py-8 text-white rounded-xl shadow-lg">
        <h1 className="text-2xl sm:text-3xl font-pally-bold">Seller Dashboard</h1>
        <p className="text-teal-100 mt-1 sm:mt-2">
          Welcome back, {userName}! Here's an overview of your activities.
        </p>
      </div>

      {/* Placeholder for Paystack Status - to be added next */}
      {/* Placeholder for Quick Actions - to be added next */}
      {/* Placeholder for Stats - to be added next */}
      
      <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
        <h2 className="text-xl font-pally-medium text-gray-700 mb-4">Content Area</h2>
        <p>More dashboard content will go here.</p>
        {userProfile?.onboardingComplete ? <p>Onboarding is complete.</p> : <p>Onboarding is NOT complete.</p>}
        {userProfile?.paystackSubaccountId ? <p>Paystack ID: {userProfile.paystackSubaccountId}</p> : <p>No Paystack ID.</p>}
      </div>

    </div>
  );
};

export default DashboardHome; 