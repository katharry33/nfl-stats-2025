// src/app/api/all-props/[id]/route.ts
import { db } from '@/lib/firebase/admin';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// DELETE /api/all-props/[id]?season=2025
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const season = new URL(req.url).searchParams.get('season') ?? '2025';
  const colName = `allProps_${season}`;

  try {
    // Try the given season first, then fallback to 2024
    const ref = db.collection(colName).doc(id);
    const doc = await ref.get();

    if (doc.exists) {
      await ref.delete();
      return NextResponse.json({ ok: true });
    }

    // Try other season
    const altSeason = season === '2025' ? '2024' : '2025';
    const altRef = db.collection(`allProps_${altSeason}`).doc(id);
    const altDoc = await altRef.get();

    if (altDoc.exists) {
      await altRef.delete();
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Not found' }, { status: 404 });

  } catch (err: any) {
    console.error('DELETE /api/all-props/[id]:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}