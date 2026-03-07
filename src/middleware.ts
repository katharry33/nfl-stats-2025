import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Define paths that SHOULD NOT be protected by the password gate
  // We exclude static files, the login page itself, and the auth API
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/login') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  // 2. Check for our custom site access cookie
  const accessCookie = request.cookies.get('site_access');

  // 3. If no cookie, redirect to our simple login page
  if (!accessCookie) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

// Ensure this matches all routes except static assets
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (internal apis that might need different auth)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};