import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. PUBLIC PATHS
  // Added /_next/image and common assets to the ignore list
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/login') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  // 2. SITE ACCESS: Global Gate (Currently Disabled for Development)
  /*
  const accessCookie = request.cookies.get('site_access');
  if (!accessCookie && pathname !== '/login') {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }
  */

  // 3. ADMIN PROTECTION
  if (pathname.startsWith('/admin')) {
    const userRole = request.cookies.get('user_role')?.value;

    /**
     * TEMPORARY BYPASS: 
     * We are currently allowing all users to access /admin 
     * while setting up the NBA engine.
     */
    /*
    if (userRole !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    */
    
    // Log for visibility in Cloud Workstation console
    console.log(`🔓 Admin access granted to path: ${pathname}`);
  }

  return NextResponse.next();
}

// FIX: Optimized matcher to ignore static files efficiently
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};