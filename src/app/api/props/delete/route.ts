import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

export async function POST(req: NextRequest) {
  try {
    const { id, league } = await req.json();

    if (!id || !league) {
      return NextResponse.json(
        { error: 'id and league are required.' },
        { status: 400 }
      );
    }

    const collection =
      league === 'nfl'
        ? 'allProps'
        : 'nbaProps_2025';

    const ref = adminDb.collection(collection).doc(id);
    await ref.delete();

    return NextResponse.json({ success: true, id });
  } catch (err) {
    console.error('[DELETE PROP ERROR]', err);
    return NextResponse.json(
      { error: 'Failed to delete prop.' },
      { status: 500 }
    );
  }
}
