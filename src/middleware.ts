import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isPublicRoute = createRouteMatcher(['/']);
export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    // In v6, protect is available directly on the auth object 
    // but the type-safe way to trigger it is:
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // This part ensures API routes are handled by the router, not skipped or blocked
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};