import { db } from '@/lib/firebase/admin';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * DELETE /api/all-props/[id]?league=nba&season=2025
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const { searchParams } = new URL(req.url);
  const league = searchParams.get('league') || 'nfl';
  const season = searchParams.get('season') || '2025';

  // Determine target collection prefix
  const colPrefix = league === 'nba' ? 'nbaProps' : 'allProps';
  const colName = `${colPrefix}_${season}`;

  try {
    // 1. Primary Attempt: Delete from specified league/season
    const ref = db.collection(colName).doc(id);
    const doc = await ref.get();

    if (doc.exists) {
      await ref.delete();
      return NextResponse.json({ ok: true, deletedFrom: colName });
    }

    // 2. Fallback: If not found, check the alternate season for the SAME league
    const altSeason = season === '2025' ? '2024' : '2025';
    const altColName = `${colPrefix}_${altSeason}`;
    const altRef = db.collection(altColName).doc(id);
    const altDoc = await altRef.get();

    if (altDoc.exists) {
      await altRef.delete();
      return NextResponse.json({ ok: true, deletedFrom: altColName });
    }

    // 3. Last Stand: If still not found, search the legacy 'allProps' (NFL) collection
    // (This helps clean up old data that might not have the new prefix yet)
    if (league === 'nfl') {
       const legacyRef = db.collection('allProps').doc(id);
       const legacyDoc = await legacyRef.get();
       if (legacyDoc.exists) {
         await legacyRef.delete();
         return NextResponse.json({ ok: true, deletedFrom: 'allProps' });
       }
    }

    return NextResponse.json({ error: 'Prop not found in any expected collection' }, { status: 404 });

  } catch (err: any) {
    console.error(`❌ DELETE /api/all-props/${id}:`, err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}