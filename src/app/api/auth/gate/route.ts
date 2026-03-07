import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  try {
    const { password } = await req.json();
    
    // 1. Grab the secret from env
    const expectedPassword = process.env.SITE_PASSWORD;

    // DEBUG LOGS - Check your terminal (not browser)
    console.log('--- Auth Debug ---');
    console.log('Received:', `"${password}"`);
    console.log('Expected:', `"${expectedPassword}"`);
    console.log('Match:', password?.trim() === expectedPassword?.trim());

    // 2. Strict check with trimming to ignore accidental spaces
    if (expectedPassword && password?.trim() === expectedPassword.trim()) {
      const cookieStore = await cookies();
      
      cookieStore.set('site_access', 'granted', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/', // Ensure it's valid for the whole site
        maxAge: 60 * 60 * 24 * 30, // 30 days
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}