import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin'; 
import { auth } from '@clerk/nextjs/server';

export async function POST(req: Request) {
  try {
    const { userId: authId } = await auth();
    if (!authId) return new NextResponse('Unauthorized', { status: 401 });

    const body = await req.json();
    const { id, ...betData } = body;

    // --- NEW: PERSIST INDIVIDUAL LEGS TO PROPS LIBRARY ---
    // If there are legs in this bet, we save them to 'allProps_2025' 
    // so they are searchable in the future.
    if (betData.legs && Array.isArray(betData.legs)) {
      const propLibrary = adminDb.collection('allProps_2025');
      
      const propPromises = betData.legs.map((leg: any) => {
        // Create a unique ID based on Player and Prop to avoid duplicates
        const propId = `${leg.player}-${leg.prop}`.replace(/\s+/g, '-').toLowerCase();
        
        return propLibrary.doc(propId).set({
          player: leg.player,
          prop: leg.prop,
          line: leg.line,
          team: leg.team,
          matchup: leg.matchup || '',
          gameDate: leg.gameDate || betData.gameDate || '',
          lastUsed: new Date().toISOString(),
          isManual: true // Helps you filter/identify user-added props
        }, { merge: true });
      });

      await Promise.all(propPromises);
    }

    // --- EXISTING BET SAVING LOGIC ---
    if (id) {
      // UPDATE existing bet
      await adminDb.collection('user_bets').doc(id).update({
        ...betData,
        updatedAt: new Date().toISOString()
      });
      return NextResponse.json({ success: true, message: 'Bet updated' });
    } else {
      // CREATE new bet
      const newDocRef = await adminDb.collection('user_bets').add({
        ...betData,
        userId: authId,
        createdAt: new Date().toISOString()
      });
      return NextResponse.json({ success: true, id: newDocRef.id });
    }

  } catch (error: any) {
    console.error('Admin Save Error:', error);
    return new NextResponse(error.message, { status: 500 });
  }
}
