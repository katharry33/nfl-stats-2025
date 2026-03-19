// src/app/api/enrich/route.ts
import { NextResponse } from 'next/server';
import { enrichPropsForWeek, enrichAllPropsCollection } from '@/lib/enrichment/enrichProps';

export async function POST(req: Request) {
  try {
    const { collection, season, week, skipEnriched } = await req.json();

    if (!season) {
      return NextResponse.json({ error: 'Season is required' }, { status: 400 });
    }

    let updatedCount = 0;

    if (collection === 'all') {
      // Logic for the historical allProps_{season} collection
      updatedCount = await enrichAllPropsCollection({
        season: Number(season),
        week: week ? Number(week) : undefined,
        skipEnriched: !!skipEnriched,
      });
    } else {
      // Logic for the live weeklyProps_{season} collection
      if (!week) {
        return NextResponse.json({ error: 'Week is required for weekly mode' }, { status: 400 });
      }
      updatedCount = await enrichPropsForWeek({
        season: Number(season),
        week: Number(week),
        skipEnriched: !!skipEnriched,
      });
    }

    return NextResponse.json({ 
      success: true, 
      count: updatedCount,
      message: `Successfully enriched ${updatedCount} props.` 
    });

  } catch (error: any) {
    console.error('❌ Enrichment API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}