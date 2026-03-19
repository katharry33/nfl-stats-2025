import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  try {
    const { password } = await req.json();
    const expectedPassword = process.env.SITE_PASSWORD;

    if (expectedPassword && password?.trim() === expectedPassword.trim()) {
      const cookieStore = await cookies();
      
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict' as const,
        path: '/', 
        maxAge: 60 * 60 * 24 * 30, // 30 days
      };

      // 1. Grant general site access
      cookieStore.set('site_access', 'granted', cookieOptions);

      // 2. Grant admin role (This fixes the Data Hub redirect)
      cookieStore.set('user_role', 'admin', cookieOptions);

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}