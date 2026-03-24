import { NextRequest, NextResponse } from 'next/server';
import { enrichAndSaveCSVProps } from '@/lib/enrichment/nba/enrichAndSaveCSV';
import Papa from 'papaparse';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // 1. Extract the date sent from NBAIngestTools
    // Default to 2025 string if season is missing
    const { csvString, season = "2025", date } = body;

    if (!csvString) {
      return NextResponse.json({ error: "No CSV data provided" }, { status: 400 });
    }

    // 2. Parse CSV with normalized headers (lowercase + trimmed)
    const parsed = Papa.parse(csvString, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase(), 
    });

    const props = parsed.data;

    if (!props || !Array.isArray(props) || props.length === 0) {
      return NextResponse.json({ error: "CSV parsing resulted in an empty dataset" }, { status: 400 });
    }

    console.log(`🚀 Ingesting ${props.length} NBA props | Season: ${season} | Date: ${date || 'Today'}`);

    // 3. Pass the 'date' parameter into your logic
    // Ensure your enrichAndSaveCSVProps function signature accepts this 3rd argument
    const results = await enrichAndSaveCSVProps(props, season, date);

    // 4. Enhanced Logging for your terminal
    if (results.errors && results.errors.length > 0) {
      console.warn(`⚠️ Partial Success. Saved: ${results.success}, Errors: ${results.errors.length}`);
    }

    return NextResponse.json({
      success: results.success,
      skipped: results.skipped || 0,
      errors: results.errors || [], // This contains the "No Logs Found" list
    });

  } catch (err: any) {
    console.error('❌ CSV Enrichment Route Error:', err);
    
    // SAFEGUARD: Ensure we return a string, not an error object, to prevent UI crashes
    return NextResponse.json(
      { error: String(err.message || "An internal server error occurred") }, 
      { status: 500 }
    );
  }
}