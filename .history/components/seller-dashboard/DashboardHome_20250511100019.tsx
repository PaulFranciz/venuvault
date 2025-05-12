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