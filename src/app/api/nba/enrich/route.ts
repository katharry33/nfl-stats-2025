
import { NextRequest, NextResponse } from 'next/server';
import { enrichAndSaveCSVProps } from '@/lib/enrichment/nba/enrichAndSaveCSV';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { props, season = 2025 } = body;

    if (!props || !Array.isArray(props)) {
      return NextResponse.json({ error: "Invalid or empty CSV payload" }, { status: 400 });
    }

    console.log(`🚀 Starting CSV Enrichment for ${props.length} rows...`);

    // Call our type-safe helper
    const results = await enrichAndSaveCSVProps(props, season);

    // LOGGING ERRORS TO TERMINAL
    if (results.errors.length > 0) {
      console.warn(`⚠️ CSV Import partial success. Skipped ${results.skipped} rows:`);
      results.errors.forEach(err => console.warn(`   - ${err}`));
    }

    return NextResponse.json({
      success: results.success,
      skipped: results.skipped,
      errors: results.errors, // Sent to frontend for the toast notification
    });

  } catch (err: any) {
    console.error('❌ CSV Enrichment Route Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
