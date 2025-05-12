'use client';

import SellerDashboard from "@/components/SellerDashboard";
import { useConvexAuth, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import Spinner from "@/components/Spinner";
import { useEffect } from "react";

export default function SellerPage() {
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const userProfile = useQuery(api.users.getUserProfile);
  const router = useRouter();

  const profileLoading = isAuthenticated && userProfile === undefined;

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      console.log("SellerPage: Not authenticated, redirecting to /sign-in");
      router.push("/sign-in"); // Or your preferred sign-in page
    }
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    if (isAuthenticated && userProfile) { // Check userProfile is loaded
      if (!userProfile.organizerProfileComplete) {
        console.log("SellerPage: Organizer onboarding not complete, redirecting to /seller/onboarding");
        router.push("/seller/onboarding");
      } else {
        console.log("SellerPage: Organizer onboarding complete.");
      }
    }
  }, [isAuthenticated, userProfile, router]);

  if (authLoading || profileLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <Spinner />
        <p className="ml-4 text-xl font-semibold text-gray-700">Loading Seller Information...</p>
      </div>
    );
  }

  // This check is a fallback, useEffect should handle it.
  if (!isAuthenticated) {
     return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <p className="text-xl font-semibold text-gray-700">Redirecting to sign in...</p>
      </div>
    );
  }

  // Render SellerDashboard if authenticated and onboarding is complete
  // The useEffect handles redirection, so if we reach here, it means onboarding is complete or profile isn't loaded yet (covered by loading state).
  if (isAuthenticated && userProfile && userProfile.organizerProfileComplete) {
    return (
      <div className="min-h-screen bg-gray-50">
        <SellerDashboard />
      </div>
    );
  }
  
  // Fallback for intermediate states or if redirection is in progress
  // Or if userProfile is null after loading (edge case, means no user record in Convex yet for an authenticated user)
  if (isAuthenticated && userProfile === null && !profileLoading) {
    // This case might indicate the user record in Convex hasn't been created yet by getOrCreateUser.
    // Depending on app logic, you might want to show a specific message or retry.
    // For now, keeping it in a loading-like state or redirecting to onboarding might be safest.
    console.log("SellerPage: User authenticated but profile is null, redirecting to onboarding as a safeguard.");
    router.push("/seller/onboarding"); 
    return (
       <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <Spinner />
        <p className="ml-4 text-xl font-semibold text-gray-700">Verifying Profile...</p>
      </div>
    );
  }

  // Default return if none of the above conditions are met, typically during brief transition states.
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Spinner />
       <p className="ml-4 text-xl font-semibold text-gray-700">Preparing Dashboard...</p>
    </div>
  );
}
