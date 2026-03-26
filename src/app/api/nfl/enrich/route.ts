import { NextResponse } from 'next/server';
import { enrichAndSaveNFLCSV } from '@/lib/enrichment/nfl/enrichAndSaveNFLCSV';
import { enrichPropsForWeek, enrichAllPropsCollection } from '@/lib/enrichment/nfl/enrichProps';

async function triggerAutoScraper(
  season: number,
  week?: number,
  collection?: string,
  skipEnriched?: boolean
) {
  try {
    let updatedCount = 0;
    if (collection === 'all') {
      updatedCount = await enrichAllPropsCollection({
        season,
        week,
        skipEnriched: !!skipEnriched,
      });
    } else {
      if (!week) {
        throw new Error('Week is required for single-week auto-enrichment.');
      }
      updatedCount = await enrichPropsForWeek({
        season,
        week,
        skipEnriched: !!skipEnriched,
      });
    }
    return NextResponse.json({
      success: true,
      count: updatedCount,
      message: `Successfully triggered automated enrichment for ${updatedCount} NFL props.`
    });
  } catch (error: any) {
    throw new Error(`Auto-scraper failed: ${error.message}`);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { mode, csvString, season, week, collection, skipEnriched } = body;

    const activeMode = mode === 'manual' && csvString ? 'manual' : 'auto';

    const seasonNum = Number(season);
    if (!seasonNum) {
        return NextResponse.json({ error: 'Season is a required parameter.' }, { status: 400 });
    }
    const weekNum = week ? Number(week) : undefined;

    if (activeMode === 'manual') {
      if (!csvString) {
          return NextResponse.json({ error: 'csvString is required for manual mode.' }, { status: 400 });
      }
      const result = await enrichAndSaveNFLCSV(csvString, season, String(week));
      return NextResponse.json({ success: true, result });
    } else {
      return await triggerAutoScraper(seasonNum, weekNum, collection, skipEnriched);
    }
  } catch (error: any) {
    console.error('🏈 NFL Enrichment Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
