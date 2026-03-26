import { NextRequest, NextResponse } from 'next/server';
import { recalculateExistingProps } from '@/lib/enrichment/nba/recalculate';
import { enrichAndSaveCSVProps } from '@/lib/enrichment/nba/enrichAndSaveCSV';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { mode, date, league, season, csvString } = body;

    console.log("Received date for enrichment:", date);

    // --- MODE A: RE-CALCULATE (From Historical Vault) ---
    if (mode === 'refine_existing') {
      if (!date) return NextResponse.json({ error: "Date required" }, { status: 400 });
      
      // This calls the utility we just wrote to fill in the Avgs/EVs
      const result = await recalculateExistingProps(Number(season), date);
      
      return NextResponse.json({ 
        success: true, 
        ...result // returns { updated, remaining } for your progress bar
      });
    }

    // --- MODE B: INITIAL INGEST (From Bet Builder) ---
    if (csvString) {
      // Your existing CSV logic remains here...
      const result = await enrichAndSaveCSVProps(csvString, Number(season), date);
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Invalid request mode" }, { status: 400 });

  } catch (error: any) {
    console.error("Enrichment Route Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}