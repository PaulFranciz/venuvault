'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { CheckCircle, Loader2 } from 'lucide-react';

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, isLoaded, isSignedIn } = useUser();
  const [authStabilized, setAuthStabilized] = useState(false);
  const transactionRef = searchParams.get('trxref') || searchParams.get('reference');

  // Allow time for authentication to stabilize after redirect
  useEffect(() => {
    if (isLoaded) {
      const timer = setTimeout(() => {
        setAuthStabilized(true);
      }, 2000); // 2 second delay for auth rehydration

      return () => clearTimeout(timer);
    }
  }, [isLoaded]);

  // Store purchase completion in localStorage for better UX
  useEffect(() => {
    if (transactionRef && isSignedIn) {
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
  }, [transactionRef, isSignedIn, user?.id]);

  useEffect(() => {
    // Redirect if no reference is found, likely means direct access
    if (!transactionRef && authStabilized) {
       console.warn('No transaction reference found on success page. Redirecting home.');
       router.push('/');
    }
  }, [transactionRef, router, authStabilized]);

  // Show loading while auth stabilizes
  if (!isLoaded || !authStabilized) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4 text-center">
        <div className="mb-6">
          <Loader2 className="w-16 h-16 text-[#F96521] animate-spin mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Processing your purchase...</h1>
          <p className="text-gray-600">
            Please wait while we confirm your payment and update your account.
          </p>
        </div>
      </div>
    );
  }

  // Show auth prompt if not signed in after stabilization
  if (!isSignedIn && authStabilized) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4 text-center">
        <CheckCircle className="w-16 h-16 text-green-500 mb-6" />
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
      <CheckCircle className="w-16 h-16 text-green-500 mb-6" />
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