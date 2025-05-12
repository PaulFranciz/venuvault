import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

// Define the public routes using createRouteMatcher
const isPublicRoute = createRouteMatcher([
  '/', // Allow homepage
  '/event/(.*)', // Allow individual event pages
  '/sign-in(.*)', // Clerk sign-in routes
  '/sign-up(.*)', // Clerk sign-up routes
  '/api/webhooks/paystack(.*)', // Paystack webhook (ensure this doesn't need auth itself)
  '/validate-ticket/(.*)', // Ticket validation page
]);

export default clerkMiddleware((auth, req: NextRequest) => {
  // If it's not a public route, then it's a protected route.
  if (!isPublicRoute(req)) {
    auth().protect(); // This will redirect to sign-in if not authenticated
  }
  // Allow the request to proceed if it's public or if auth().protect() doesn't redirect
  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals, static files, and API routes generally,
    // unless API routes are specifically meant to be protected by this logic.
    // The /api/webhooks/paystack is explicitly public.
    '/((?!.+\.[\w]+$|_next).*)', // Exclude files with extensions and _next
    '/', // Include root
    '/(api|trpc)(.*)', // Include API routes, but they'll be checked by isPublicRoute
  ],
};
