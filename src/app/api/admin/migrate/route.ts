import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  console.log('🚀 Starting Migration: normalizing bettingLog collection...');
  
  try {
    const db = getAdminDb();
    const bettingLogRef = db.collection('bettingLog');
    
    const snapshot = await bettingLogRef.get();
    console.log(`(1/3) Found ${snapshot.size} total documents.`);

    const batch = db.batch();
    let count = 0;

    snapshot.forEach((doc) => {
      const data = doc.data();
      const updates: any = {};

      // 1. Fix User ID
      if (data.uid && !data.userId) {
        updates.userId = data.uid;
        console.log(`[ID FIX] Document ${doc.id}: Mapping uid to userId`);
      }

      // 2. Fix Legs Schema
      if (!data.legs || !Array.isArray(data.legs) || data.legs.length === 0) {
        updates.legs = [{
          player: data.player || 'Legacy Bet',
          prop: data.prop || '',
          selection: data.selection || '',
          line: data.line || '',
          odds: Number(data.odds || 0),
          matchup: data.matchup || '',
          team: data.team || '',
          status: (data.status || data.result || 'pending').toLowerCase()
        }];
        console.log(`[SCHEMA FIX] Document ${doc.id}: Wrapping legacy data into legs array`);
      }

      // 3. Fix Date for Sorting
      if ((data.gameDate || data.date) && !data.createdAt) {
        updates.createdAt = new Date(data.gameDate || data.date);
        console.log(`[DATE FIX] Document ${doc.id}: Created createdAt timestamp`);
      }

      if (Object.keys(updates).length > 0) {
        batch.update(doc.ref, updates);
        count++;
      }
    });

    console.log(`(2/3) Prepared ${count} updates. Committing to Firestore...`);

    if (count > 0) {
      await batch.commit();
    }

    console.log('(3/3) Migration complete! Verify on the Betting History page.');

    return NextResponse.json({ 
      success: true, 
      message: `Processed ${snapshot.size} records. Updated ${count} records.` 
    });

  } catch (error: any) {
    console.error("❌ Migration Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}