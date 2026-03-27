import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

export async function POST(req: NextRequest) {
  try {
    const { id, league, updates } = await req.json();

    if (!id || !league || !updates) {
      return NextResponse.json(
        { error: 'id, league, and updates are required.' },
        { status: 400 }
      );
    }

    const collection =
      league === 'nfl'
        ? 'allProps'
        : 'nbaProps_2025';

    const ref = adminDb.collection(collection).doc(id);

    await ref.update({
      ...updates,
      updatedAt: new Date().toISOString()
    });

    return NextResponse.json({ success: true, id, updates });
  } catch (err) {
    console.error('[UPDATE PROP ERROR]', err);
    return NextResponse.json(
      { error: 'Failed to update prop.' },
      { status: 500 }
    );
  }
}
