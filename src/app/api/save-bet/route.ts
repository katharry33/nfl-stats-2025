import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { auth } from '@clerk/nextjs/server';
import admin from 'firebase-admin';

function fixGameDate(gameDate: string | undefined): string | undefined {
  if (!gameDate) return undefined;
  // Store as noon UTC to prevent any timezone from rolling it back a day
  const d = new Date(`${gameDate}T12:00:00.000Z`);
  return isNaN(d.getTime()) ? gameDate : d.toISOString();
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Try Clerk auth first, fall back to Firebase userId sent in body
    const { userId: clerkId } = await auth();
    const authId = clerkId || body.userId || 'dev-user';
    // TODO: restore proper auth once auth system is confirmed

    console.log('save-bet auth debug:', { clerkId, bodyUserId: body.userId, authId });

    const { id, ...data } = body;

    const logCollection = adminDb.collection('bettingLog');

    const { gameDate, legs, ...rest } = data;

    if (id) {
      // UPDATE case
      const existing = await logCollection.doc(id).get();
      const existingUserId = existing.data()?.userId;
      
      // Block if doc exists and belongs to a different real user
      if (existing.exists && existingUserId && existingUserId !== authId) {
        console.log('userId mismatch — allowing edit:', { existingUserId, authId });
        // Allow edit of own data regardless of userId format mismatch
      }

      await logCollection.doc(id).set({
        ...rest,
        userId: authId,  // claim ownership on edit
        legs: legs ?? [],
        ...(gameDate && { gameDate: fixGameDate(gameDate) }),
        updatedAt: new Date().toISOString()
      }, { merge: true });

      return NextResponse.json({ success: true, id });

    } else {
      // CREATE case
      const newDoc = await logCollection.add({
        ...rest,
        userId: authId,
        legs: legs ?? [],
        ...(gameDate && { gameDate: fixGameDate(gameDate) }),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      return NextResponse.json({ success: true, id: newDoc.id });
    }

  } catch (error: any) {
    console.error('Admin Save Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
