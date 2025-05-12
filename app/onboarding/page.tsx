'use client';

import { useConvexAuth, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import OnboardingForm from "./OnboardingForm";
import { useEffect } from "react";

export default function OnboardingPage() {
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const userProfile = useQuery(api.users.getUserProfile);
  const profileLoading = userProfile === undefined && isAuthenticated; // Profile is loading if undefined and user is authenticated
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      // If not authenticated and auth is done loading, redirect to sign-in or home
      // Assuming you have a sign-in page at /sign-in
      router.push("/sign-in"); // Or your preferred auth page
    }
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    if (userProfile && userProfile.onboardingComplete) {
      console.log("Onboarding complete, redirecting to dashboard...");
      router.push("/dashboard/events"); // Redirect to dashboard if onboarding is complete
    }
  }, [userProfile, router]);

  if (authLoading || profileLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="p-8 text-center">
          {/* You can use a spinner component here */}
          <p className="text-xl font-semibold text-gray-700">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // This case should be handled by the useEffect redirect, but as a fallback:
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <p className="text-xl font-semibold text-gray-700">Redirecting to sign in...</p>
      </div>
    );
  }
  
  // If authenticated and onboarding is not complete (or profile is null initially before completion)
  if (isAuthenticated && (!userProfile || !userProfile.onboardingComplete)) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="mb-12 text-center">
            <h1 className="text-4xl sm:text-5xl font-extrabold text-white">
              Welcome, Organizer!
            </h1>
            <p className="mt-4 text-lg sm:text-xl text-slate-300">
              Let's get your profile set up so you can start creating amazing events.
            </p>
          </div>
          <OnboardingForm userProfile={userProfile} />
        </div>
      </main>
    );
  }

  // Fallback or if logic gets here unexpectedly
  return null;
} 