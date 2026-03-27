// app/api/nfl/ingest/route.ts

import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import crypto from 'crypto';
import Papa from 'papaparse';
import { getCurrentNFLWeek } from '@/lib/enrichment/nfl/getCurrentWeek'; // your helper
import type { NFLPropDoc } from '@/lib/types';

function computeRowHash(row: any) {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(row))
    .digest('hex')
    .slice(0, 16);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { csvString, season, date, uploadId } = body;

    if (!csvString || !season || !date || !uploadId) {
      return NextResponse.json(
        { error: 'Missing required fields: csvString, season, date, uploadId' },
        { status: 400 }
      );
    }

    const parsed = Papa.parse(csvString, { header: true, skipEmptyLines: true });
    const rows = parsed.data as any[];

    if (!rows || rows.length === 0) {
      return NextResponse.json(
        { error: 'CSV contained no rows' },
        { status: 400 }
      );
    }

    const collectionName = `nflProps_${season}`;
    const batch = adminDb.batch();

    let count = 0;
    const week = getCurrentNFLWeek(season);

    for (const row of rows) {
      const player = row.player || row.Player;
      const prop = row.prop || row.Prop;
      const line = Number(row.line ?? row.Line);
      const odds = Number(row.odds ?? row.Odds) || -110;

      if (!player || !prop || Number.isNaN(line)) continue;

      const rowHash = computeRowHash(row);
      const docId = `${uploadId}_${rowHash}`;
      const docRef = adminDb.collection(collectionName).doc(docId);

      const overUnder = row.overUnder || row.OverUnder || 'over';

      const doc: Partial<NFLPropDoc> = {
        id: docId,
        uploadId,
        rowHash,
        rawRow: row,
        ingestMeta: {
          ingestedAt: new Date().toISOString(),
          source: row.source || 'csv',
        },
        player,
        team: row.team || row.Team || null,
        opponent: row.opponent || row.Opponent || row.matchup || row.Matchup || null,
        gameDate: date,
        season,
        league: 'nfl',
        prop,
        propNorm: prop.toLowerCase().trim(),
        line,
        overUnder,
        odds,
        impliedProb:
          odds < 0
            ? Math.abs(odds) / (Math.abs(odds) + 100)
            : 100 / (odds + 100),
        status: 'pending',
        enriched: false,
        week,
      };

      batch.set(docRef, doc, { merge: true });
      count++;
    }

    await batch.commit();

    return NextResponse.json({
      success: true,
      count,
      message: `Ingested ${count} NFL props for ${date}`,
    });
  } catch (err: any) {
    console.error('NFL Ingest Error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
