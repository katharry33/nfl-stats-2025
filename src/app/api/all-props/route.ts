// src/app/api/all-props/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

function pick(data: any, ...keys: string[]): any {
  for (const k of keys) {
    if (data[k] !== undefined && data[k] !== null && data[k] !== '') return data[k];
  }
  return null;
}

function normalizeProp(data: any, docId: string) {
  const migratedFrom: string = data.migratedFrom ?? '';
  const seasonMatch = migratedFrom.match(/(\d{4})/);
  const season = seasonMatch ? parseInt(seasonMatch[1]) : null;
  const prop      = pick(data, 'prop', 'Prop') ?? '';
  const overUnder = pick(data, 'over under', 'overunder', 'overUnder', 'Over/Under?') ?? '';

  return {
    id:        docId,
    player:    pick(data, 'player', 'Player') ?? '',
    prop,
    line:      pick(data, 'line', 'Line') ?? 0,
    week:      pick(data, 'week', 'Week') ?? null,
    matchup:   pick(data, 'matchup', 'Matchup') ?? '',
    team:      pick(data, 'team', 'Team') ?? '',
    overUnder,
    gameDate:  pick(data, 'game date', 'gamedate', 'gameDate', 'date', 'Game Date'),
    gameTime:  pick(data, 'game time', 'gametime', 'gameTime', 'Game Time') ?? '',
    season,
    migratedFrom,
    actualResult:    pick(data, 'actual stats', 'actualstats', 'actualResult') ?? '',
    playerAvg:       pick(data, 'player avg', 'playeravg', 'playerAvg') ?? null,
    opponentRank:    pick(data, 'opponent rank', 'opponentrank', 'opponentRank') ?? null,
    seasonHitPct:    pick(data, 'season hit %', 'seasonhit', 'seasonHitPct') ?? null,
    projWinPct:      pick(data, 'proj win %', 'projwin', 'projWinPct') ?? null,
    confidenceScore: pick(data, 'confidence score', 'confidencescore', 'confidenceScore') ?? null,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const playerQ = (searchParams.get('player') ?? '').trim().toLowerCase();
    const propQ   = (searchParams.get('prop')   ?? '').trim().toLowerCase();
    const weekQ   =  searchParams.get('week')   ?? '';
    const seasonQ =  searchParams.get('season') ?? 'all';

    const weekNum = weekQ && weekQ !== 'all' ? parseInt(weekQ, 10) : null;

    // Fetch — try both numeric and string week values, then merge by doc ID
    let allDocs: Map<string, FirebaseFirestore.QueryDocumentSnapshot>;

    if (weekNum !== null && !isNaN(weekNum)) {
      const [snapNum, snapStr, snapUpper] = await Promise.all([
        adminDb.collection('allProps').where('week',  '==', weekNum).limit(5000).get(),
        adminDb.collection('allProps').where('week',  '==', String(weekNum)).limit(5000).get(),
        adminDb.collection('allProps').where('Week',  '==', weekNum).limit(5000).get(),
      ]);
      allDocs = new Map();
      for (const doc of [...snapNum.docs, ...snapStr.docs, ...snapUpper.docs]) {
        allDocs.set(doc.id, doc);
      }
      console.log(`📦 week=${weekNum}: num=${snapNum.size} str=${snapStr.size} upper=${snapUpper.size} total=${allDocs.size}`);
    } else {
      const snap = await adminDb.collection('allProps').limit(5000).get();
      allDocs = new Map(snap.docs.map(d => [d.id, d]));
      console.log(`📦 allProps all: ${allDocs.size} docs`);
    }

    let props = Array.from(allDocs.values()).map(doc => normalizeProp(doc.data(), doc.id));

    // ── CRITICAL: exact week match in-memory as safety net ──────────────────
    // Prevents "9" matching week 19 (e.g. if week stored as string in some docs)
    if (weekNum !== null && !isNaN(weekNum)) {
      props = props.filter(p => {
        const w = p.week;
        if (w === null || w === undefined) return false;
        return Number(w) === weekNum; // strict numeric equality
      });
    }

    // Season filter
    if (seasonQ !== 'all') {
      const seasonNum = parseInt(seasonQ, 10);
      props = props.filter(p => p.season === seasonNum);
    }

    // Prop type filter
    if (propQ) {
      props = props.filter(p => p.prop.toLowerCase().includes(propQ));
    }

    // Player filter
    if (playerQ) {
      props = props.filter(p => p.player.toLowerCase().includes(playerQ));
    }

    props.sort((a, b) => {
      const wDiff = (b.week ?? 0) - (a.week ?? 0);
      if (wDiff !== 0) return wDiff;
      return a.player.localeCompare(b.player);
    });

    const propTypes = [...new Set(
      Array.from(allDocs.values())
        .map(d => { const dd = d.data(); return (dd.prop ?? dd.Prop ?? '') as string; })
        .filter(Boolean)
    )].sort();

    return NextResponse.json({ props, propTypes, total: props.length });

  } catch (error: any) {
    console.error('❌ all-props route:', error);
    return NextResponse.json(
      { error: error.message ?? 'Internal server error', props: [], propTypes: [] },
      { status: 500 }
    );
  }
}