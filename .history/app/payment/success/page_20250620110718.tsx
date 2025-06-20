'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

// CSS-based icons to avoid hydration mismatch
const CheckIcon = () => (
  <div className="w-16 h-16 mx-auto mb-6 relative">
    <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center">
      <div className="w-8 h-4 border-l-4 border-b-4 border-white transform rotate-[-45deg] translate-x-[2px] translate-y-[-2px]"></div>
    </div>
  </div>
);

const LoadingIcon = () => (
  <div className="w-16 h-16 mx-auto mb-4 relative">
    <div className="w-16 h-16 border-4 border-gray-200 rounded-full"></div>
    <div className="absolute top-0 left-0 w-16 h-16 border-4 border-[#F96521] border-t-transparent rounded-full animate-spin"></div>
  </div>
);

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, isLoaded, isSignedIn } = useUser();
  const [mounted, setMounted] = useState(false);
  const transactionRef = searchParams.get('trxref') || searchParams.get('reference');

  // Ensure client-side mounting to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Store purchase completion in localStorage for better UX
  useEffect(() => {
    if (mounted && transactionRef && isSignedIn) {
      try {
        localStorage.setItem('ticwaka_recent_purchase', JSON.stringify({
          reference: transactionRef,
          timestamp: Date.now(),
          userId: user?.id
        }));
      } catch (e) {
        console.error('Failed to store purchase info:', e);
      }
    }
  }, [mounted, transactionRef, isSignedIn, user?.id]);

  useEffect(() => {
    // Redirect if no reference is found, likely means direct access
    if (mounted && !transactionRef) {
       console.warn('No transaction reference found on success page. Redirecting home.');
       router.push('/');
    }
  }, [mounted, transactionRef, router]);

  // Always render the same structure to avoid hydration mismatch
  if (!mounted) {
    // During SSR and initial client render, show consistent loading state
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4 text-center">
        <LoadingIcon />
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Processing your purchase...</h1>
        <p className="text-gray-600">
          Please wait while we confirm your payment and update your account.
        </p>
      </div>
    );
  }

  // After mounting, show loading while auth stabilizes
  if (!isLoaded) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4 text-center">
        <LoadingIcon />
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Processing your purchase...</h1>
        <p className="text-gray-600">
          Please wait while we confirm your payment and update your account.
        </p>
      </div>
    );
  }

  // Show auth prompt if not signed in after loading
  if (!isSignedIn) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4 text-center">
        <CheckIcon />
        <h1 className="text-3xl font-bold text-gray-800 mb-3">Payment Successful!</h1>
        <p className="text-lg text-gray-600 mb-6">
          Your payment was processed successfully. Please sign in to access your tickets.
        </p>
        {transactionRef && (
          <p className="text-sm text-gray-500 mb-8">
            Transaction Reference: {transactionRef}
          </p>
        )}
        <div className="space-y-4">
          <Link href="/sign-in?redirect_url=/tickets">
            <Button size="lg" className="bg-[#F96521] hover:bg-[#e55511]">
              Sign In to View Tickets
            </Button>
          </Link>
          <Link href="/">
            <Button variant="link">Go to Homepage</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4 text-center">
      <CheckIcon />
      <h1 className="text-3xl font-bold text-gray-800 mb-3">Payment Successful!</h1>
      <p className="text-lg text-gray-600 mb-6">
        Your ticket purchase is being processed. You will receive confirmation shortly.
      </p>
      {transactionRef && (
        <p className="text-sm text-gray-500 mb-8">
          Transaction Reference: {transactionRef}
        </p>
      )}
      <div className="space-y-4">
        <Link href="/tickets">
          <Button size="lg" className="bg-[#F96521] hover:bg-[#e55511]">
            View My Tickets
          </Button>
        </Link>
        <Link href="/">
          <Button variant="link">Go to Homepage</Button>
        </Link>
      </div>
    </div>
  );
} 