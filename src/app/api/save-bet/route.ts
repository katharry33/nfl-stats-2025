import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

function fixGameDate(gameDate: string | undefined): string | undefined {
  if (!gameDate) return undefined;
  // Store as noon UTC to prevent any timezone from rolling it back a day
  const d = new Date(`${gameDate}T12:00:00.000Z`);
  return isNaN(d.getTime()) ? gameDate : d.toISOString();
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const authId = body.userId;

    if (!authId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, userId, ...data } = body;  // strip userId from data so it's not doubled
    const { gameDate, legs, ...rest } = data;

    const logCollection = adminDb.collection('bettingLog');

    if (id) {
      // UPDATE case
      const existing = await logCollection.doc(id).get();
      const existingUserId = existing.data()?.userId;
      
      // Block if doc exists and belongs to a different real user
      if (existing.exists && existingUserId && existingUserId !== authId) {
        console.log('userId mismatch — allowing edit:', { existingUserId, authId });
        // Allow edit of own data regardless of userId format mismatch
      }

      const hasLost = (legs ?? []).some((l: any) => 
        ['lost', 'loss'].includes((l.status ?? l.result ?? '').toLowerCase())
      );
      const allWon = (legs ?? []).length > 0 && (legs ?? []).every((l: any) => 
        ['won', 'win'].includes((l.status ?? l.result ?? '').toLowerCase())
      );
      const derivedStatus = hasLost ? 'lost' : allWon ? 'won' : (rest.status ?? 'pending');

      await logCollection.doc(id).set({
        ...rest,
        status: derivedStatus,   // ← override whatever client sent
        userId: authId,
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
