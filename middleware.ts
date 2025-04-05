import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware({
  // Define routes that should be publicly accessible
  publicRoutes: [
    '/', // Example: Make the homepage public
    '/event/(.*)', // Example: Make event detail pages public
    '/api/webhooks/paystack(.*)', // Make your webhook public
    // Clerk automatically handles /sign-in and /sign-up routes
  ],
  // ignoredRoutes: [] // Add any routes to completely ignore if needed
});

export const config = {
  // The following matcher runs middleware on all routes
  // except static assets.
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
