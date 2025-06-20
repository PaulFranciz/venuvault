import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

// Define the public routes using createRouteMatcher
const isPublicRoute = createRouteMatcher([
  '/', // Allow homepage
  '/event/(.*)', // Allow individual event pages
  '/sign-in(.*)', // Clerk sign-in routes
  '/sign-up(.*)', // Clerk sign-up routes
  '/api/webhooks/paystack(.*)', // Paystack webhook
  '/api/cron/(.*)', // Cron job API endpoints - token-based auth instead of Clerk
  '/api/events/(.*)', // Event API endpoints
  '/api/queue/(.*)', // Queue API endpoints
  '/api/health/(.*)', // Health check endpoints
  '/api/users/(.*)', // User API endpoints (with internal auth checks)
  '/api/geocode(.*)', // Geocoding API
  '/api/validate-discount(.*)', // Discount validation
  '/validate-ticket/(.*)', // Ticket validation page
  '/creators/overview', // Creator landing page
  '/creators/(.*)', // All creators pages
  '/images/(.*)', // Allow all image paths
  '/favicon.ico', // Allow favicon
  '/_next/(.*)', // Allow Next.js static assets
  '/discover', // Public event discovery page
  '/about', // About page
  '/features', // Features page
  '/pricing', // Pricing page
  '/blog', // Blog page
  '/search', // Search page
]);

export default clerkMiddleware(async (auth, req: NextRequest) => {
  const url = req.nextUrl.pathname;
  
  // Skip middleware for static files, images, and api routes
  if (
    url.includes('/_next/') || 
    url.includes('/images/') || 
    url.endsWith('.ico') || 
    url.endsWith('.png') || 
    url.endsWith('.svg') || 
    url.endsWith('.jpg') || 
    url.endsWith('.jpeg') || 
    url.endsWith('.webp')
  ) {
    return NextResponse.next();
  }
  
  // If it's not a public route, then it's a protected route
  if (!isPublicRoute(req)) {
    // Check if user is authenticated
    const session = await auth();
    if (!session.userId) {
      // Redirect to homepage with a sign-in parameter
      // Your app uses modal sign-in rather than dedicated pages
      const homeUrl = new URL('/', req.url);
      homeUrl.searchParams.set('sign_in', 'true');
      homeUrl.searchParams.set('redirect_url', req.url);
      return NextResponse.redirect(homeUrl);
    }
  }
  // Allow the request to proceed if it's public or if user is authenticated
  return NextResponse.next();
});

export const config = {
  matcher: [
    '/((?!.+\.[\w]+$|_next).*)', // Exclude files with extensions and _next
    '/', // Include root
    '/creators/:path*',
    '/create-event',
    '/(api|trpc)(.*)', // Include API routes, but they'll be checked by isPublicRoute
  ],
};