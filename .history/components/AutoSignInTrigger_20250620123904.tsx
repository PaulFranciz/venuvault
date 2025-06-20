"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useClerk } from "@clerk/nextjs";

/**
 * This component checks URL parameters to automatically trigger the sign-in modal
 * when users are redirected from protected pages
 */
export default function AutoSignInTrigger() {
  const searchParams = useSearchParams();
  const { openSignIn } = useClerk();
  const [mounted, setMounted] = useState(false);
  
  // Prevent hydration mismatch by only running on client
  useEffect(() => {
    setMounted(true);
  }, []);
  
  useEffect(() => {
    if (!mounted) return;
    
    // Check if the sign_in parameter exists in the URL
    const shouldSignIn = searchParams.get("sign_in") === "true";
    const redirectUrl = searchParams.get("redirect_url");
    
    if (shouldSignIn) {
      // Open the sign-in modal with the redirect URL
      openSignIn({
        redirectUrl: redirectUrl || undefined,
      });
    }
  }, [mounted, searchParams, openSignIn]);

  // This component doesn't render anything
  return null;
}
