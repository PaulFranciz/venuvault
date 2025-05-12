import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
// import { NextRequest } from "next/server"; // NextRequest is not explicitly needed here with the new structure

// Define routes that should be protected
const isProtectedRoute = createRouteMatcher([
  '/seller(/.*)?', // Protects /seller and /seller/*
  // Add any other routes here that need to be protected, e.g., '/dashboard(/.*)?'
]);

export default clerkMiddleware((auth, req) => {
  // If the route is a protected route, call auth().protect()
  if (isProtectedRoute(req)) {
    auth().protect(); // Note: auth() returns the AuthObject, then call .protect()
  }
  // For public routes or routes not matching isProtectedRoute, 
  // the middleware will not intervene with auth.protect(), allowing public access.
});

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * 
     * This ensures that Clerk middleware runs on all pages and an API route 
     * if you have one that needs auth (though typically API routes are handled separately or are public like webhooks)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)', 
    '/', // Also explicitly match the root if not covered by the above
  ],
};
