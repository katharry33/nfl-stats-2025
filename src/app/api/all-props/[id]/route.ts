import { adminDb as db } from '@/lib/firebase/admin';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/all-props/[id]?league=nba&season=2025
 * Updates a specific prop in the archive
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const body = await req.json();
  const { searchParams } = new URL(req.url);
  const league = searchParams.get('league') || 'nfl';
  const season = searchParams.get('season') || '2025';

  const colPrefix = league === 'nba' ? 'nbaProps' : 'allProps';
  const collections = [
    `${colPrefix}_${season}`,
    `${colPrefix}_${season === '2025' ? '2024' : '2025'}`,
    'allProps' // Legacy NFL fallback
  ];

  try {
    // We iterate through the same fallback logic as DELETE to find where the doc lives
    for (const col of collections) {
      if (col === 'allProps' && league !== 'nfl') continue;

      const ref = db.collection(col).doc(id);
      const doc = await ref.get();

      if (doc.exists) {
        // Remove ID from body to prevent overwriting the document ID
        const { id: _, ...updates } = body;
        
        await ref.update({
          ...updates,
          updatedAt: new Date().toISOString()
        });
        
        return NextResponse.json({ ok: true, updatedIn: col });
      }
    }

    return NextResponse.json({ error: 'Prop not found for update' }, { status: 404 });
  } catch (err: any) {
    console.error(`❌ PATCH /api/all-props/${id}:`, err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

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

  const colPrefix = league === 'nba' ? 'nbaProps' : 'allProps';
  const colName = `${colPrefix}_${season}`;

  try {
    // 1. Primary Attempt
    const ref = db.collection(colName).doc(id);
    const doc = await ref.get();
    if (doc.exists) {
      await ref.delete();
      return NextResponse.json({ ok: true, deletedFrom: colName });
    }

    // 2. Fallback: Alternate season
    const altSeason = season === '2025' ? '2024' : '2025';
    const altColName = `${colPrefix}_${altSeason}`;
    const altRef = db.collection(altColName).doc(id);
    const altDoc = await altRef.get();
    if (altDoc.exists) {
      await altRef.delete();
      return NextResponse.json({ ok: true, deletedFrom: altColName });
    }

    // 3. Last Stand: Legacy NFL
    if (league === 'nfl') {
       const legacyRef = db.collection('allProps').doc(id);
       const legacyDoc = await legacyRef.get();
       if (legacyDoc.exists) {
         await legacyRef.delete();
         return NextResponse.json({ ok: true, deletedFrom: 'allProps' });
       }
    }

    return NextResponse.json({ error: 'Prop not found' }, { status: 404 });
  } catch (err: any) {
    console.error(`❌ DELETE /api/all-props/${id}:`, err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}