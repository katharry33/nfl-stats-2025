import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      player,
      team,
      opponent,
      matchup,
      prop,
      line,
      overUnder,
      league,
      season,
      gameDate,
      week
    } = body;

    // -----------------------------
    // VALIDATION
    // -----------------------------
    if (!player || !team || !opponent || !prop || !line || !league || !season) {
      return NextResponse.json(
        { error: 'Missing required fields for ingestion.' },
        { status: 400 }
      );
    }

    if (league === 'nfl' && !week) {
      return NextResponse.json(
        { error: 'NFL props require a week number.' },
        { status: 400 }
      );
    }

    if (league === 'nba' && !gameDate) {
      return NextResponse.json(
        { error: 'NBA props require a gameDate.' },
        { status: 400 }
      );
    }

    // -----------------------------
    // COLLECTION SELECTION
    // -----------------------------
    const collection =
      league === 'nfl'
        ? 'allProps'
        : 'nbaProps_2025';

    // -----------------------------
    // INGESTION METADATA
    // -----------------------------
    const uploadId = crypto.randomUUID();
    const rowHash = crypto
      .createHash('sha256')
      .update(`${player}-${team}-${opponent}-${prop}-${line}-${gameDate || week}`)
      .digest('hex');

    const ingestMeta = {
      ingestedAt: new Date().toISOString(),
      source: 'manual-ui'
    };

    // -----------------------------
    // NORMALIZED MATCHUP
    // -----------------------------
    const normalizedMatchup =
      matchup ||
      (team && opponent ? `${team}@${opponent}` : null);

    // -----------------------------
    // DOCUMENT TO WRITE
    // -----------------------------
    const doc = {
      uploadId,
      rowHash,
      rawRow: body,
      ingestMeta,

      player,
      team,
      opponent,
      matchup: normalizedMatchup,

      prop,
      propNorm: prop.toLowerCase().replace(/\s+/g, '_'),
      line: Number(line),
      overUnder: overUnder || null,

      league,
      season,

      // NFL vs NBA date structure
      gameDate: gameDate || null,
      week: league === 'nfl' ? Number(week) : null,

      // Default ingestion state
      status: 'pending',
      enriched: false,
      lastEnriched: null,

      // Optional fields (null until enrichment)
      impliedProb: null,
      odds: null,
      playerAvg: null,
      opponentRank: null,
      opponentAvgVsStat: null,
      modelProb: null,
      expectedValue: null,
      confidenceScore: null,
      bestEdge: null,
      seasonHitPct: null,

      // Post-game fields
      actual: null,
      result: null,
      scoreDiff: null,

      createdAt: new Date().toISOString()
    };

    // -----------------------------
    // WRITE TO FIRESTORE
    // -----------------------------
    const ref = await adminDb.collection(collection).add(doc);

    return NextResponse.json({
      success: true,
      id: ref.id,
      collection,
      doc
    });
  } catch (err) {
    console.error('[POST /api/props/add] Error:', err);
    return NextResponse.json(
      { error: 'Failed to add prop.' },
      { status: 500 }
    );
  }
}
