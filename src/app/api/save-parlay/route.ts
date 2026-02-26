// src/app/api/save-parlay/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

// ─── Duplicate check ──────────────────────────────────────────────────────────
// For each leg, query bettingLog for a doc with matching player + prop + week.
// Returns any matches found — caller decides whether to block or warn.

async function findDuplicateLegs(
  legs: { player: string; prop: string; week?: number | null }[]
): Promise<{ leg: typeof legs[0]; matchedDocId: string; matchedPlayer: string; matchedProp: string }[]> {
  const duplicates: { leg: typeof legs[0]; matchedDocId: string; matchedPlayer: string; matchedProp: string }[] = [];

  for (const leg of legs) {
    if (!leg.player || !leg.prop || !leg.week) continue;

    try {
      // Query by player + week — prop check done in-memory to avoid composite index
      const snap = await adminDb
        .collection('bettingLog')
        .where('player', '==', leg.player)
        .where('week',   '==', leg.week)
        .limit(20)
        .get();

      for (const doc of snap.docs) {
        const data = doc.data();
        const storedProp = (data.prop ?? '').toLowerCase().trim();
        const incomingProp = leg.prop.toLowerCase().trim();

        if (storedProp === incomingProp) {
          duplicates.push({
            leg,
            matchedDocId:    doc.id,
            matchedPlayer:   data.player ?? leg.player,
            matchedProp:     data.prop   ?? leg.prop,
          });
          break; // one match per leg is enough
        }
      }
    } catch (e) {
      // If index doesn't exist yet, skip the check for this leg rather than blocking the save
      console.warn(`⚠️ Duplicate check skipped for ${leg.player}:`, (e as any).message);
    }
  }

  return duplicates;
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const force = searchParams.get('force') === 'true'; // bypass duplicate check

    const body = await request.json();
    const {
      stake         = 0,
      legs          = [],
      parlayResults = { totalOdds: 0, payout: 0 },
      userId        = 'anonymous',
      week          = null,
      gameDate      = null,
    } = body;

    if (!legs || legs.length === 0) {
      return NextResponse.json({ error: 'No legs in parlay' }, { status: 400 });
    }

    // ── Duplicate check (skip if force=true) ──────────────────────────────────
    if (!force) {
      const duplicates = await findDuplicateLegs(
        legs.map((l: any) => ({
          player: l.player || l.Player || '',
          prop:   l.prop   || l.Prop   || '',
          week:   Number(l.week ?? week) || null,
        }))
      );

      if (duplicates.length > 0) {
        return NextResponse.json(
          {
            error:      'duplicate',
            message:    `${duplicates.length} leg(s) already exist in your Betting Log for this week.`,
            duplicates: duplicates.map(d => ({
              player: d.matchedPlayer,
              prop:   d.matchedProp,
              docId:  d.matchedDocId,
            })),
          },
          { status: 409 },
        );
      }
    }

    // ── Write one doc per leg, all sharing a parlayId ─────────────────────────
    const parlayId = adminDb.collection('bettingLog').doc().id;
    const batch    = adminDb.batch();

    for (const leg of legs as any[]) {
      const legRef = adminDb.collection('bettingLog').doc();
      batch.set(legRef, {
        player:           leg.player    || leg.Player    || 'N/A',
        prop:             leg.prop      || leg.Prop      || 'N/A',
        line:             Number(leg.line)  || 0,
        odds:             Number(leg.odds)  || 0,
        selection:        leg.selection || leg.overUnder || 'Over',
        matchup:          leg.matchup   || leg.Matchup   || 'N/A',
        team:             leg.team      || leg.Team      || leg.playerteam || '',
        gameDate:         leg.gameDate  || gameDate      || null,
        week:             Number(leg.week ?? week)        || null,
        status:           leg.status    || 'pending',
        parlayid:         parlayId,
        parlayOdds:       Number(parlayResults.totalOdds) || 0,
        stake:            Number(stake) || 0,
        potentialPayout:  Number(parlayResults.payout)    || 0,
        userId,
        createdAt:        FieldValue.serverTimestamp(),
      });
    }

    await batch.commit();

    return NextResponse.json({ success: true, id: parlayId });

  } catch (error: any) {
    console.error('❌ save-parlay error:', error);
    return NextResponse.json(
      { error: error.message, details: 'Check firebase admin init and leg fields' },
      { status: 500 },
    );
  }
}