import { adminDb } from '@/lib/firebase/admin';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const collectionRef = adminDb.collection('allProps');
    const snapshot = await collectionRef.get();

    if (snapshot.empty) {
      return NextResponse.json({ message: 'No documents found to repair.' });
    }

    const batch = adminDb.batch();
    let count = 0;

    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      const updates: any = {};

      // 1. Add missing league field (Defaulting to nfl since you requested it)
      if (!data.league) {
        updates.league = 'nfl';
      }

      // 2. Normalize Season from gameDate string (e.g., "2025-09-08" -> 2025)
      if (!data.season) {
        const dateStr = data.gameDate || data['game date'];
        if (dateStr && typeof dateStr === 'string') {
          updates.season = parseInt(dateStr.substring(0, 4), 10);
        }
      }

      // 3. Normalize field names (Removing spaces)
      if (data['game date'] && !data.gameDate) {
        updates.gameDate = data['game date'];
      }
      if (data['over under'] && !data.overUnder) {
        updates.overUnder = data['over under'];
      }

      // Only add to batch if there are actual changes
      if (Object.keys(updates).length > 0) {
        batch.update(doc.ref, updates);
        count++;
      }
    });

    if (count > 0) {
      await batch.commit();
    }

    return NextResponse.json({ 
      success: true, 
      message: `Successfully repaired ${count} documents.`,
      totalScanned: snapshot.size 
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}