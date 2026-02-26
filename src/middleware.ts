import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// Define the route that is public
const isPublicRoute = createRouteMatcher(['/']);

export default clerkMiddleware((auth, request) => {
  // If the route is not public, then it's protected.
  if (!isPublicRoute(request)) {
    // The `auth` object passed to the middleware has the `protect()` method.
    // This will handle redirecting unauthenticated users to the sign-in page.
    auth.protect();
  }
});
