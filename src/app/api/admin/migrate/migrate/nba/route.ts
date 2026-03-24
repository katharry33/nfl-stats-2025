///migrate nba
// src/app/api/admin/migrate/route.ts
import { adminDb as db } from '@/lib/firebase/admin';
import { NextResponse } from 'next/server';

export async function GET() {
  const today = "2026-03-23";
  const snapshot = await db.collection('nbaProps_2025')
    .where('date', '==', today)
    .get();

  const batch = db.batch();
  snapshot.docs.forEach(doc => {
    // Only add it if it's missing
    if (!doc.data().league) {
      batch.update(doc.ref, { league: 'nba' });
    }
  });

  await batch.commit();
  return NextResponse.json({ migrated: snapshot.size });
}