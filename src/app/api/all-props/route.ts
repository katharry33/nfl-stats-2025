// src/app/api/all-props/route.ts
// Serves the Bet Builder page — reads from weeklyProps_{season}
// Serves the Historical Props page — reads from allProps_{season}
// ?week=22        → filters to that week
// ?collection=all → reads allProps instead of weeklyProps

import { NextRequest, NextResponse } from 'next/server';
import { getAllProps, getPropsForWeek } from '@/lib/enrichment/firestore';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const weekParam  = searchParams.get('week');
    const bust       = searchParams.get('bust') === 'true';
    const season     = parseInt(searchParams.get('season') ?? '2025', 10);
    const collection = searchParams.get('collection') ?? 'weekly'; // 'weekly' | 'all'

    const week = weekParam ? parseInt(weekParam, 10) : null;

    let props: any[];

    if (collection === 'all' || !week) {
      // Historical props page — allProps_{season}
      props = await getAllProps(week, bust);
    } else {
      // Bet Builder — weeklyProps_{season} week N
      props = await getPropsForWeek(season, week);
    }

    const propTypes = Array.from(
      new Set(props.map((p: any) => p.prop ?? p.Prop).filter(Boolean))
    ).sort() as string[];

    return NextResponse.json({
      props,
      propTypes,
      totalCount: props.length,
      cacheAge: bust ? 0 : 60,
    }, {
      headers: {
        'Cache-Control': bust
          ? 'no-store, max-age=0, must-revalidate'
          : 'public, s-maxage=60, stale-while-revalidate=30',
      },
    });

  } catch (error: any) {
    console.error('Error fetching props:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}