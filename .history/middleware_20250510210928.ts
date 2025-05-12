import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextRequest } from 'next/server';

// Define the public routes using createRouteMatcher
const isPublicRoute = createRouteMatcher([
  '/', // Homepage
  '/event/(.*)', // Event detail pages
  '/api/webhooks/paystack(.*)', // Paystack webhook
  '/validate-ticket/(.*)', // Add ticket validation page route
  // Clerk also automatically handles /sign-in, /sign-up, etc., these are not strictly needed here
  // but doesn't hurt to list if being explicit.
]);

export default clerkMiddleware((auth, req: NextRequest) => {
  if (!isPublicRoute(req)) {
    auth.protect();
  }
});

export const config = {
  matcher: [
    // This matcher is a common recommendation from Clerk:
    // It matches all routes except for static files (containing a .) and Next.js internals (_next).
    '/((?!.+\\.[\\w]+$|_next).*)', 
    '/', // Explicitly match the root.
    '/(api|trpc)(.*)' // Match all API routes.
  ],
};
