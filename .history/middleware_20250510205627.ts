import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextRequest } from 'next/server';

// Define the public routes using createRouteMatcher
const isPublicRoute = createRouteMatcher([
  '/', // Homepage
  '/event/(.*)', // Event detail pages
  '/api/webhooks/paystack(.*)', // Paystack webhook
  '/validate-ticket/(.*)', // Add ticket validation page route
  // Clerk also automatically handles /sign-in, /sign-up, etc.
]);

export default clerkMiddleware((auth, req: NextRequest) => {
  if (!isPublicRoute(req)) {
    // For routes that are not public, protect them.
    // Users will be redirected to the sign-in page if they are not authenticated.
    auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals, static files, and public images
    '/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    // Run on all other routes including / and /api
    '/',
    '/(api|trpc)(.*)',
  ],
};
