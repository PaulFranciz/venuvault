"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, useEffect } from "react";

export type UserRole = "creator" | "buyer";

// Much simpler hook that doesn't rely on the problematic query
export function useUserRole(): { 
  role: UserRole | null; 
  isLoading: boolean;
  isCreator: boolean;
  error: Error | null;
} {
  const { user, isLoaded, isSignedIn } = useUser();
  const [role, setRole] = useState<UserRole | null>(null);
  const [isCreator, setIsCreator] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Use a more reliable query - just get all events for this user
  const userEvents = useQuery(
    api.events.getSellerEvents,
    isSignedIn && user?.id ? { userId: user.id } : "skip"
  );
  
  useEffect(() => {
    // Not signed in
    if (!isSignedIn && isLoaded) {
      setRole(null);
      setIsCreator(false);
      setIsLoading(false);
      return;
    }
    
    // Still loading Clerk auth
    if (!isLoaded) {
      setIsLoading(true);
      return;
    }
    
    // Handle timeout for loading state
    const timeoutId = setTimeout(() => {
      if (isLoading) {
        console.warn("Role determination timeout, defaulting to buyer");
        setRole("buyer");
        setIsCreator(false);
        setIsLoading(false);
        setError(new Error("Timed out determining user role"));
      }
    }, 2000);
    
    // If we have query results
    if (Array.isArray(userEvents)) {
      // User is a creator if they have any events
      const hasEvents = userEvents.length > 0;
      setRole(hasEvents ? "creator" : "buyer");
      setIsCreator(hasEvents);
      setIsLoading(false);
      setError(null);
    }
    
    return () => clearTimeout(timeoutId);
  }, [isSignedIn, isLoaded, userEvents, isLoading]);
  
  return {
    role,
    isLoading,
    isCreator,
    error
  };
}
