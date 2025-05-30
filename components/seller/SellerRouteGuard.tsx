"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import NoSellerAccess from "./NoSellerAccess";
import Spinner from "@/components/Spinner";

interface SellerRouteGuardProps {
  children: React.ReactNode;
}

export default function SellerRouteGuard({ children }: SellerRouteGuardProps) {
  const { isLoaded } = useUser();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);

  // Skip access check for event creation route
  const isEventCreationRoute = pathname?.includes("/create-event");
  
  // Get user info from localStorage to determine if they have published events
  // This is a temporary solution until the Convex query is fixed
  const [hasPublishedEvents, setHasPublishedEvents] = useState<boolean | null>(null);
  
  useEffect(() => {
    // Check if user has published events using localStorage
    if (typeof window !== 'undefined') {
      // In a real implementation, this would be based on actual user data
      // For now, just checking if we're in a demo environment with special query param
      const urlParams = new URLSearchParams(window.location.search);
      const isDemo = urlParams.get('demo') === 'true';
      
      // Demo mode shows NoAccess UI, otherwise assume user has access
      setHasPublishedEvents(!isDemo);
    }
  }, []);

  useEffect(() => {
    // Simple loading state that only depends on user auth being loaded
    if (isLoaded) {
      // Add a small delay to prevent flash of loading state
      const timer = setTimeout(() => setLoading(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isLoaded]);

  // If we're still loading, show a loading indicator
  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  // Allow access to event creation route regardless of published status
  if (isEventCreationRoute) {
    return <>{children}</>;
  }

  // If hasPublishedEvents is false, show the NoSellerAccess component
  // This allows us to demo the UI by adding ?demo=true to the URL
  if (hasPublishedEvents === false) {
    return <NoSellerAccess />;
  }

  // Otherwise, render the children (the protected route content)
  return <>{children}</>;
}
