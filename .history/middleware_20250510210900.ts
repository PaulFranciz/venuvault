import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware({
  // Routes that don't require authentication
  publicRoutes: [
    "/", // Homepage
    "/event/(.*)", // Event detail pages
    "/api/webhooks/paystack(.*)", // Paystack webhook
    "/validate-ticket/(.*)", // Add ticket validation page route
    // Clerk's own auth routes like /sign-in, /sign-up are typically handled automatically
    // or don't need to be listed as public if authMiddleware handles them correctly.
  ],
  // You can also specify ignoredRoutes if needed, for example:
  // ignoredRoutes: ["/api/some_unprotected_api"],
});

export const config = {
  // This matcher is a common recommendation from Clerk to protect all routes
  // by default, excluding static files and Next.js internals.
  matcher: [
    '/((?!.+\\.[\\w]+$|_next).*)', // Excludes files with extensions and _next folder
    '/', // Ensure the root is covered
    '/(api|trpc)(.*)' // Covers API routes
  ],
};
