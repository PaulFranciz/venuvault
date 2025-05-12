import { authMiddleware } from "@clerk/nextjs/server";

export default authMiddleware({
  // Add public routes here
  // Routes that don't require authentication
  publicRoutes: [
    "/", // Homepage
    "/event/(.*)", // Event detail pages
    "/api/webhooks/paystack(.*)", // Paystack webhook
    "/validate-ticket/(.*)", // Add ticket validation page route
    // Clerk's own auth routes like /sign-in, /sign-up are handled automatically
  ],
  // You can also specify ignoredRoutes if needed, for example:
  // ignoredRoutes: ["/api/some_unprotected_api"],
});

export const config = {
  // Protects all routes, including api/trpc.
  // See https://clerk.com/docs/references/nextjs/auth-middleware
  // for more information about configuring your Middleware
  matcher: [
    "/((?!.*\\..*|_next).*)", // Matches all paths except those with a dot (likely static files) or _next
    "/", 
    "/(api|trpc)(.*)"
  ],
};
