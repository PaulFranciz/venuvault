'use client';

import { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { CheckCircle } from 'lucide-react';

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const transactionRef = searchParams.get('trxref') || searchParams.get('reference');

  // Optional: You could add logic here to verify the transaction
  // using the reference with your backend if needed, but often
  // relying solely on the webhook is sufficient and more reliable.

  useEffect(() => {
    // Redirect if no reference is found, likely means direct access
    if (!transactionRef) {
       console.warn('No transaction reference found on success page. Redirecting home.');
       // Optional: redirect to home or an error page
       // router.push('/');
    }
  }, [transactionRef, router]);

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
      <Link href="/tickets">
        <Button size="lg">View My Tickets</Button>
      </Link>
      <Link href="/">
         <Button variant="link" className="mt-4">Go to Homepage</Button>
      </Link>
    </div>
  );
} 