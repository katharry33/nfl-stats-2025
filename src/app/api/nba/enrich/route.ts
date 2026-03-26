import { NextResponse } from 'next/server';
import { enrichAndSaveNBACSV } from '@/lib/enrichment/nba/enrichAndSaveNBACSV'
// Placeholder for the automated scraper trigger
async function triggerAutoScraper(date?: string, season?: number) {
  // In a real implementation, this would trigger a background job or a serverless function
  console.log(`Automated scraper triggered for date: ${date}, season: ${season}`);
  // For now, return a success response
  return NextResponse.json({ success: true, message: "Automated scraper job started." });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { mode, csvString, date, season } = body;

    // Sanitize the mode or default to auto
    const activeMode = mode === 'manual' && csvString ? 'manual' : 'auto';

    if (activeMode === 'manual') {
      const result = await enrichAndSaveNBACSV(csvString, season);
      return NextResponse.json(result);
    } else {
      // Trigger your automated scraper here
      return await triggerAutoScraper(date, season);
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
