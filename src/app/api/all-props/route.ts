import { NextRequest, NextResponse } from 'next/server';
import { getAllProps } from '@/lib/enrichment/firestore';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const week = searchParams.get('week');
    const bust = searchParams.get('bust') === 'true';

    // The getAllProps function will handle the database logic
    const { props, propTypes, totalCount } = await getAllProps(week, bust);

    return NextResponse.json({ 
      props,
      propTypes,
      totalCount,
      cacheAge: bust ? 0 : 60, 
    }, {
      headers: {
        'Cache-Control': bust 
          ? 'no-store, max-age=0, must-revalidate' 
          : 'public, s-maxage=60, stale-while-revalidate=30'
      }
    });

  } catch (error: any) {
    console.error('Error fetching props:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
