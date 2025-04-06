import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";

// Define the public routes using createRouteMatcher
const isPublicRoute = createRouteMatcher([
  '/', // Homepage
  '/event/(.*)', // Event detail pages
  '/api/webhooks/paystack(.*)', // Paystack webhook
  '/validate-ticket/(.*)', // Add ticket validation page route
  // Clerk automatically handles /sign-in and /sign-up routes
]);

export default clerkMiddleware((auth, req: NextRequest) => {
  // If the route is not public, protect it
  if (!isPublicRoute(req)) {
    auth.protect();
  }
  // No need to return anything if not combining with other middleware
});

export const config = {
  // The following matcher runs middleware on all routes
  // except static assets.
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
