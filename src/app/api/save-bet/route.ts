import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin'; 
import { auth } from '@clerk/nextjs/server';

// Add this helper at the top of the file:
function fixGameDate(gameDate: string | undefined): string | undefined {
  if (!gameDate) return undefined;
  // Store as noon UTC to prevent any timezone from rolling it back a day
  const d = new Date(`${gameDate}T12:00:00.000Z`);
  return isNaN(d.getTime()) ? gameDate : d.toISOString();
}

export async function POST(req: Request) {
  try {
    const { userId: authId } = await auth();
    if (!authId) return new NextResponse('Unauthorized', { status: 401 });

    const body = await req.json();
    const { id, legs, ...betData } = body;

    // 1. CALCULATE AGGREGATE STATUS (The "All Must Win" Rule)
    const hasLost = legs?.some((l: any) => l.status === 'lost');
    const allWon = legs?.every((l: any) => l.status === 'won');
    const parlayStatus = hasLost ? 'lost' : (allWon ? 'won' : 'pending');

    // 2. SANITIZE LEGS (Force Numbers & Types)
    const sanitizedLegs = legs?.map((leg: any) => ({
      ...leg,
      line: Number(leg.line) || 0,
      odds: Number(leg.odds) || 0,
      status: (leg.status || 'pending') as 'pending' | 'won' | 'lost' | 'void',
      selection: leg.selection as 'Over' | 'Under'
    })) || [];

    // 3. PERSIST TO PROPS LIBRARY
    if (sanitizedLegs.length > 0) {
      const propLibrary = adminDb.collection('allProps_2025');
      const propPromises = sanitizedLegs.map((leg: any) => {
        if (!leg.player || !leg.prop) return Promise.resolve();
        const propId = `${leg.player}-${leg.prop}`.replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase();
        
        return propLibrary.doc(propId).set({
          ...leg,
          lastUsed: new Date().toISOString(),
          isManual: true
        }, { merge: true });
      });
      await Promise.all(propPromises);
    }

    // 4. PREPARE FINAL BET DATA
    const { gameDate, ...restOfBetData } = betData;
    const finalData = {
      ...restOfBetData,
      legs: sanitizedLegs,
      status: parlayStatus, // Overwrites status with parlay logic
      userId: authId,
      updatedAt: new Date().toISOString(),
      ...(gameDate && { gameDate: fixGameDate(gameDate) }),
    };

    // 5. SAVE TO bettingLog
    if (id) {
      await adminDb.collection('bettingLog').doc(id).set(finalData, { merge: true });
      return NextResponse.json({ success: true, status: parlayStatus });
    } else {
      const newDoc = await adminDb.collection('bettingLog').add({
        ...finalData,
        createdAt: new Date().toISOString()
      });
      return NextResponse.json({ success: true, id: newDoc.id, status: parlayStatus });
    }

  } catch (error: any) {
    console.error('Admin Save Error:', error);
    return new NextResponse(error.message, { status: 500 });
  }
}