import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. PUBLIC PATHS
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/login') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  // 2. SITE ACCESS: Global Gate
  const accessCookie = request.cookies.get('site_access');
  if (!accessCookie) {
    // Prevent redirect loop if already on login
    if (pathname === '/login') return NextResponse.next();
    
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

 // 3. ADMIN PROTECTION
if (pathname.startsWith('/admin')) {
  const userRole = request.cookies.get('user_role')?.value;
  
  // TEMPORARY BYPASS: Comment out these lines to access the Hub
  /*
  if (userRole !== 'admin') {
    return NextResponse.redirect(new URL('/', request.url));
  }
  */
}

  return NextResponse.next();
}

// FIX: This must be OUTSIDE the function body
export const config = {
  matcher: [
    /*
     * Match all paths except internal Next.js assets
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};