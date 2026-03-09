// src/app/api/all-props/route.ts
import { db } from '@/lib/firebase/admin';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get('limit') || '1000', 10);
  const lastId = searchParams.get('lastId'); // The cursor

  try {
    let query = db.collection('allProps_2025')
      .orderBy('week', 'desc')
      .orderBy('__name__', 'desc') // Essential for stable pagination
      .limit(limit);

    if (lastId) {
      const lastDoc = await db.collection('allProps_2025').doc(lastId).get();
      if (lastDoc.exists) {
        query = query.startAfter(lastDoc);
      }
    }

    const snapshot = await query.get();
    const props = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const response = {
      props,
      lastId: props.length === limit ? props[props.length - 1]?.id : null,
      hasMore: props.length === limit,
    };

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('Error fetching all props:', error);
    return NextResponse.json({ error: 'Failed to fetch props' }, { status: 500 });
  }
}
