import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Plus, CalendarDays, TrendingUp, CreditCard, ArrowRight, Eye, Edit } from 'lucide-react';
import Spinner from '@/components/Spinner';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useUser } from '@clerk/nextjs';
import { format } from 'date-fns';
import { useStorageUrl } from '@/lib/utils';

// Define interfaces
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
}

export interface PaystackAccountStatus {
  isActive: boolean;
  hasBankDetails: boolean;
  subaccountCode: string | null;
  accountName?: string | null; 
  bankName?: string | null;
  message?: string | null;
}

// Event interface with imageUrl property
export interface EventWithMetrics {
  _id: string;
  name: string;
  eventDate: number;
  location: string;
  isPublished: boolean;
  is_cancelled?: boolean;
  totalTickets?: number;
  imageUrl?: string; // Add this property
  imageStorageId?: string;
  thumbnailImageStorageId?: string;
  metrics?: {
    soldTickets: number;
    revenue: number;
  };
  userId: string;
}

// PayoutAccountStatusDisplay Component
interface PayoutAccountStatusDisplayProps {
  status: PaystackAccountStatus | null;
  onSetupPayout: () => void;
}

const PayoutAccountStatusDisplay: React.FC<PayoutAccountStatusDisplayProps> = ({ status, onSetupPayout }) => {
  if (!status || !status.subaccountCode) {
    return (
      <div className="text-center py-8 bg-[#F9F6F0] p-6 rounded-lg shadow-md border border-[#F96521]/20 my-6">
        <CreditCard className="w-12 h-12 mx-auto text-[#F96521] mb-3" />
        <h4 className="font-medium text-[#0C090C] text-lg mb-2">Link Your Payout Account</h4>
        <p className="text-[#0C090C]/70 mb-4">Please link your Paystack account to activate event creation and ticket sales.</p>
        <Button onClick={onSetupPayout} className="bg-[#F96521] hover:bg-[#F96521]/90 text-white">
          <CreditCard className="mr-2 h-4 w-4" /> Setup Payout Account
        </Button>
      </div>
    );
  }
  
  const isReady = status.isActive && status.hasBankDetails;
  
  return (
    <div className="bg-[#F9F6F0] rounded-lg p-6 border border-[#F96521]/20 shadow-sm space-y-4 my-6">
      <h3 className="text-lg font-medium text-[#0C090C] mb-3">Payout Account Status</h3>
      <div className="flex items-center">
        <span className={`w-3 h-3 rounded-full mr-2 ${isReady ? 'bg-[#4ADE80]' : 'bg-[#EAB308]'}`}></span>
        <span className="font-medium text-[#0C090C]">
          {isReady ? "Active & Ready for Payouts" : "Needs Attention / Pending Verification"}
        </span>
      </div>
      <p className="text-sm text-[#0C090C]/70">
        {status.message || (isReady ? "Your account is set up to receive payouts from your event sales." : "Your Paystack subaccount may be inactive or bank details are still under review by Paystack.")}
      </p>
      <p className="text-xs text-[#0C090C]/60">Subaccount Code: {status.subaccountCode}</p>
      {isReady && status.accountName && status.bankName && (
        <p className="text-sm text-[#0C090C]/70">Account: {status.accountName} - {status.bankName}</p>
      )}
      <a href="https://dashboard.paystack.com/#/login" target="_blank" rel="noopener noreferrer" className="text-sm text-[#F96521] hover:underline">
        Go to Paystack Dashboard for more details
      </a>
    </div>
  );
};

// Main component props
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
  const { user } = useUser();
  
  // Fetch the seller's events
  const events = useQuery(api.events.getSellerEvents, { 
    userId: user?.id || '' 
  }) as EventWithMetrics[] | undefined;
  
  const userName = userProfile?.name || 'Seller';
  const isPaystackReady = paystackStatus?.isActive && paystackStatus?.hasBankDetails;

  // Calculate real metrics from events data
  const metrics = React.useMemo(() => {
    if (!events || events.length === 0) {
      return {
        totalRevenue: 0,
        activeEvents: 0,
        ticketsSoldLast30Days: 0,
        totalTicketsSold: 0
      };
    }

    const now = Date.now();
    const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);

    let totalRevenue = 0;
    let activeEvents = 0;
    let ticketsSoldLast30Days = 0;
    let totalTicketsSold = 0;

    events.forEach(event => {
      // Calculate total revenue
      if (event.metrics?.revenue) {
        totalRevenue += event.metrics.revenue;
      }

      // Count active events (future events that are published and not cancelled)
      if (event.eventDate > now && event.isPublished && !event.is_cancelled) {
        activeEvents++;
      }

      // Count total tickets sold
      if (event.metrics?.soldTickets) {
        totalTicketsSold += event.metrics.soldTickets;
      }

      // For tickets sold in last 30 days, we'd need ticket purchase dates
      // For now, we'll use total sold tickets as an approximation
      // TODO: Implement proper last 30 days calculation when ticket purchase dates are available
      if (event.metrics?.soldTickets) {
        ticketsSoldLast30Days += event.metrics.soldTickets;
      }
    });

    return {
      totalRevenue,
      activeEvents,
      ticketsSoldLast30Days,
      totalTicketsSold
    };
  }, [events]);

  return (
    <div className="space-y-8">
      <div className="bg-gradient-to-r from-brand-teal to-teal-700 px-6 py-8 text-white rounded-xl shadow-lg">
        <h1 className="text-2xl sm:text-3xl font-pally-bold">Seller Dashboard</h1>
        <p className="text-teal-100 mt-1 sm:mt-2">
          Welcome back, {userName}! Here's an overview of your activities.
        </p>
      </div>

      {/* Paystack Status Section */}
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

      {/* Quick Actions - Show only if Paystack is ready and onboarding is complete */}
      {isPaystackReady && userProfile?.onboardingComplete && (
        <div className="bg-[#F9F6F0] p-6 rounded-lg shadow-md border border-[#F96521]/20">
          <h3 className="text-xl font-medium text-[#0C090C] mb-6">Quick Actions</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Link href="/create-event" className="block p-4 bg-[#F96521] text-white rounded-lg hover:bg-[#F96521]/90 transition-colors text-center shadow-sm">
              <Plus className="w-6 h-6 mx-auto mb-2" /> Create New Event
            </Link>
            <Link href="/seller/events" className="block p-4 bg-[#0C090C] text-white rounded-lg hover:bg-[#0C090C]/90 transition-colors text-center shadow-sm">
              <CalendarDays className="w-6 h-6 mx-auto mb-2" /> View My Events
            </Link>
            <Link href="/seller/analytics" className="block p-4 bg-[#4ADE80] text-white rounded-lg hover:bg-[#4ADE80]/90 transition-colors text-center shadow-sm">
              <TrendingUp className="w-6 h-6 mx-auto mb-2" /> View Analytics
            </Link>
          </div>
        </div>
      )}

      {/* Real-time Stats - Show if onboarding is complete */}
      {userProfile?.onboardingComplete && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <div className="bg-[#F9F6F0] p-6 rounded-lg shadow-md border border-[#F96521]/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 bg-[#F96521]/10 rounded-bl-full"></div>
            <h4 className="font-medium text-[#0C090C]/70 mb-2">Total Gross Revenue</h4>
            <p className="text-3xl font-bold text-[#F96521]">₦{metrics.totalRevenue.toLocaleString()}</p>
            <p className="text-sm text-[#0C090C]/60">All time</p>
          </div>
          <div className="bg-[#F9F6F0] p-6 rounded-lg shadow-md border border-[#F96521]/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 bg-[#F96521]/10 rounded-bl-full"></div>
            <h4 className="font-medium text-[#0C090C]/70 mb-2">Active Events</h4>
            <p className="text-3xl font-bold text-[#F96521]">{metrics.activeEvents}</p>
            <Link href="/seller/events" className="text-sm text-[#F96521] hover:underline">Manage events</Link>
          </div>
          <div className="bg-[#F9F6F0] p-6 rounded-lg shadow-md border border-[#F96521]/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 bg-[#F96521]/10 rounded-bl-full"></div>
            <h4 className="font-medium text-[#0C090C]/70 mb-2">Tickets Sold (Last 30d)</h4>
            <p className="text-3xl font-bold text-[#F96521]">{metrics.ticketsSoldLast30Days}</p>
            <Link href="/seller/analytics" className="text-sm text-[#F96521] hover:underline">View sales report</Link>
          </div>
        </div>
      )}
      
      {/* Dashboard Content - Only show if onboarding is complete and Paystack is ready */}
      {userProfile?.onboardingComplete && isPaystackReady && (
        <div className="space-y-8 mt-6">
          {/* Quick Action Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            <Link href="/seller/events/new" className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-[#F96521]/10 rounded-full flex items-center justify-center mb-4">
                <Plus className="w-6 h-6 text-[#F96521]" />
              </div>
              <h3 className="font-bold text-lg text-[#0C090C] mb-2">Create Event</h3>
              <p className="text-sm text-[#0C090C]/70">Set up a new event with tickets and promotion</p>
            </Link>
            
            <Link href="/seller/events" className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-[#F96521]/10 rounded-full flex items-center justify-center mb-4">
                <CalendarDays className="w-6 h-6 text-[#F96521]" />
              </div>
              <h3 className="font-bold text-lg text-[#0C090C] mb-2">Manage Events</h3>
              <p className="text-sm text-[#0C090C]/70">View and edit all your events</p>
            </Link>
            
            <Link href="/seller/analytics" className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-[#F96521]/10 rounded-full flex items-center justify-center mb-4">
                <TrendingUp className="w-6 h-6 text-[#F96521]" />
              </div>
              <h3 className="font-bold text-lg text-[#0C090C] mb-2">View Analytics</h3>
              <p className="text-sm text-[#0C090C]/70">See sales data and event performance</p>
            </Link>
            
            <Link href="/seller/settings" className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-[#F96521]/10 rounded-full flex items-center justify-center mb-4">
                <CreditCard className="w-6 h-6 text-[#F96521]" />
              </div>
              <h3 className="font-bold text-lg text-[#0C090C] mb-2">Payout Settings</h3>
              <p className="text-sm text-[#0C090C]/70">Manage your payment information</p>
            </Link>
          </div>
          
          {/* Event Cards with Analytics */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-[#0C090C]">Your Events</h2>
              <Link href="/seller/events" className="text-[#F96521] text-sm font-medium hover:underline flex items-center">
                View All <ArrowRight className="ml-1 w-4 h-4" />
              </Link>
            </div>
            
            {events === undefined ? (
              <div className="flex justify-center items-center py-16">
                <Spinner />
              </div>
            ) : events === null || events.length === 0 ? (
              <div className="bg-white rounded-lg p-8 text-center shadow-sm border border-gray-100">
                <CalendarDays className="w-12 h-12 mx-auto text-[#F96521]/40 mb-4" />
                <h3 className="text-lg font-bold text-[#0C090C] mb-2">No Events Found</h3>
                <p className="text-sm text-[#0C090C]/70 mb-6">You haven't created any events yet. Start by creating your first event!</p>
                <Link href="/seller/events/new">
                  <Button className="bg-[#F96521] hover:bg-[#F96521]/90 text-white">
                    <Plus className="mr-2 h-4 w-4" /> Create Event
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {events.map((event) => (
                  <EventCard key={event._id} event={event} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Fallback for when onboarding might be complete but Paystack is not yet linked */}
      {!isPaystackReady && userProfile?.onboardingComplete && !paystackStatusLoading && !paystackStatusError && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 my-6">
          <div className="flex">
            <div className="py-1">
              <svg className="fill-current h-6 w-6 text-yellow-500 mr-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                <path d="M2.93 17.07A10 10 0 1 1 17.07 2.93 10 10 0 0 1 2.93 17.07zM9 5v6h2V5H9zm0 8v2h2v-2H9z"/>
              </svg>
            </div>
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

// Event Card Component for displaying individual events with their thumbnails
interface EventCardProps {
  event: EventWithMetrics;
}

const EventCard: React.FC<EventCardProps> = ({ event }) => {
  const isActive = new Date(event.eventDate) > new Date();
  const isPast = new Date(event.eventDate) < new Date();
  const isCancelled = event.is_cancelled;
  
  // Calculate status badge
  let statusBadge = {
    text: 'Upcoming',
    className: 'bg-[#94A3B8]/20 text-[#64748B]'
  };
  
  if (isActive && event.isPublished) {
    statusBadge = {
      text: 'Active',
      className: 'bg-[#4ADE80]/20 text-[#16A34A]'
    };
  } else if (isPast) {
    statusBadge = {
      text: 'Past',
      className: 'bg-[#94A3B8]/20 text-[#64748B]'
    };
  } else if (isCancelled) {
    statusBadge = {
      text: 'Cancelled',
      className: 'bg-[#EF4444]/20 text-[#EF4444]'
    };
  } else if (!event.isPublished) {
    statusBadge = {
      text: 'Draft',
      className: 'bg-[#EAB308]/20 text-[#EAB308]'
    };
  }
  
  // Calculate metrics
  const totalTickets = event.totalTickets || 0;
  const soldTickets = event.metrics?.soldTickets || 0;
  const revenue = event.metrics?.revenue || 0;
  
  // Properly handle the image storage IDs by casting them to the correct Convex type
  const mainImageUrl = useStorageUrl(
    event.imageStorageId ? event.imageStorageId as Id<"_storage"> : undefined
  );
  const thumbnailUrl = useStorageUrl(
    event.thumbnailImageStorageId ? event.thumbnailImageStorageId as Id<"_storage"> : undefined
  );
  
  // Use the first available image source
  const imageUrl = event.imageUrl || mainImageUrl || thumbnailUrl;
  
  return (
    <div className="bg-white rounded-lg overflow-hidden shadow-md border border-gray-100 flex flex-col">
      <div className="relative h-48 bg-gray-200">
        {imageUrl ? (
          <div className="relative h-full w-full">
            <Image 
              src={imageUrl} 
              alt={event.name || 'Event'} 
              layout="fill"
              objectFit="cover"
            />
          </div>
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-[#F96521]/20 to-[#F96521]/5 flex items-center justify-center">
            <CalendarDays className="w-12 h-12 text-[#F96521]/40" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
        <div className="absolute bottom-3 left-3 text-white">
          <p className="text-xs font-medium">
            {event.eventDate ? format(new Date(event.eventDate), 'EEE, MMMM dd, yyyy') : 'Date TBD'}
          </p>
          <h4 className="text-lg font-bold">{event.name}</h4>
          <p className="text-sm">{event.location}</p>
        </div>
      </div>
      <div className="p-4 flex-1 flex flex-col">
        <div className="flex justify-between items-center mb-3">
          <div>
            <span className="text-sm">Sold: <span className="font-medium text-[#F96521]">{soldTickets}</span>/{totalTickets}</span>
          </div>
          <span className={`px-2 py-1 ${statusBadge.className} text-xs rounded-full font-medium`}>
            {statusBadge.text}
          </span>
        </div>
        <div className="text-sm mb-3">
          <p className="font-medium text-[#0C090C]">Net Profit:</p>
          <p className="text-lg font-bold text-[#F96521]">₦{revenue.toLocaleString()}</p>
        </div>
        <div className="mt-auto flex justify-between pt-3 border-t">
          <div className="flex space-x-2">
            <Link href={`/seller/events/${event._id}`} className="p-2 text-gray-500 hover:text-[#F96521]">
              <Eye className="w-5 h-5" />
            </Link>
                            <Link href="/create-event" className="p-2 text-gray-500 hover:text-[#F96521]">
              <Edit className="w-5 h-5" />
            </Link>
          </div>
          {isPast ? (
            <Link href={`/seller/analytics?eventId=${event._id}`} className="text-[#F96521] font-medium text-sm hover:underline">
              View Report
            </Link>
          ) : (
            <Link href={`/seller/events/${event._id}`} className="text-[#F96521] font-medium text-sm hover:underline">
              Manage
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardHome;