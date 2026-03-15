// src/app/api/sweet-spots/route.ts
//
// Analyzes ALL won legs from bettingLog cross-referenced with allProps enrichment
// data to find statistically significant sweet spots across every dimension.

import { db } from '@/lib/firebase/admin';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function toIso(v: any): string | null {
  if (!v) return null;
  if (typeof v === 'string') return v;
  if (v?.toDate) return v.toDate().toISOString();
  return null;
}

function n(v: any): number | null {
  const x = Number(v);
  return v == null || isNaN(x) ? null : x;
}

function pct(won: number, total: number) {
  return total >= 3 ? Math.round((won / total) * 1000) / 10 : null;
}

function bucketHitRate(
  entries: { won: boolean; value: number | null }[],
  buckets: { label: string; min: number; max: number }[]
) {
  const counts = Object.fromEntries(buckets.map(b => [b.label, { won: 0, total: 0 }]));
  for (const e of entries) {
    if (e.value == null) continue;
    const b = buckets.find(b => e.value! >= b.min && e.value! < b.max);
    if (!b) continue;
    counts[b.label].total++;
    if (e.won) counts[b.label].won++;
  }
  return buckets
    .map(b => ({ ...b, ...counts[b.label], hitRate: pct(counts[b.label].won, counts[b.label].total) }))
    .filter(b => b.total >= 3);
}

export async function GET() {
  try {
    // ── 1. Load bettingLog ────────────────────────────────────────────────────
    const logSnap = await db.collection('bettingLog').get();
    const allBets = logSnap.docs.map(d => {
      const r = d.data();
      return {
        id: d.id,
        ...r,
        createdAt: toIso(r.createdAt),
        status: (r.status ?? '').toLowerCase(),
        stake: n(r.stake ?? r.wager) ?? 0,
        odds:  n(r.odds) ?? 0,
        legs:  r.legs ?? [],
      };
    });

    // ── 2. Load allProps (both seasons) ────────────────────────────────────────
    const [snap25, snap24] = await Promise.all([
      db.collection('allProps_2025').get(),
      db.collection('allProps_2024').get(),
    ]);

    // Build a lookup: player||prop → enrichment data (pick most recent)
    const propLookup = new Map<string, any>();
    for (const doc of [...snap24.docs, ...snap25.docs]) {
      const r = doc.data();
      const key = `${(r.player ?? '').toLowerCase().trim()}||${(r.prop ?? '').toLowerCase().trim()}`;
      propLookup.set(key, r);
    }

    // ── 3. Flatten all legs with enrichment ────────────────────────────────────
    interface LegRecord {
      player: string;
      prop:   string;
      won:    boolean;
      legs:   number; // leg count in parent bet
      // enrichment fields
      scoreDiff?:      number | null;
      confidenceScore?: number | null;
      opponentRank?:   number | null;
      bestEdgePct?:    number | null;
      kellyPct?:       number | null;
      overUnder?:      string;
      matchup?:        string;
      week?:           number | null;
      season?:         number | null;
    }

    const legRecords: LegRecord[] = [];
    const betLevelRecords: { won: boolean; legCount: number; stake: number }[] = [];

    for (const bet of allBets) {
      const betWon = ['won', 'win'].includes(bet.status);
      const betLost = ['lost', 'loss'].includes(bet.status);
      if (!betWon && !betLost) continue;

      const legs: any[] = bet.legs?.length
        ? bet.legs
        : [{ player: (bet as any).player, prop: (bet as any).prop, status: bet.status, odds: bet.odds }];

      betLevelRecords.push({ won: betWon, legCount: legs.length, stake: bet.stake });

      for (const leg of legs) {
        const legStatus = (leg.status ?? bet.status ?? '').toLowerCase();
        const legWon  = ['won', 'win'].includes(legStatus);
        const legLost = ['lost', 'loss'].includes(legStatus);
        if (!legWon && !legLost) continue;

        const player   = (leg.player ?? '').toLowerCase().trim();
        const propName = (leg.prop   ?? '').toLowerCase().trim();
        const lookupKey = `${player}||${propName}`;
        const enriched  = propLookup.get(lookupKey) ?? {};

        const sd   = n(enriched.scoreDiff);
        const conf = (() => {
          const c = n(enriched.confidenceScore);
          return c == null ? null : c <= 1 ? c * 100 : c;
        })();
        const edge = (() => {
          const e = n(enriched.bestEdgePct);
          return e == null ? null : e <= 1 ? e * 100 : e;
        })();
        const kelly = (() => {
          const k = n(enriched.kellyPct);
          return k == null ? null : k <= 1 ? k * 100 : k;
        })();

        legRecords.push({
          player:          leg.player ?? '',
          prop:            leg.prop ?? '',
          won:             legWon,
          legs:            legs.length,
          scoreDiff:       sd,
          confidenceScore: conf,
          opponentRank:    n(enriched.opponentRank),
          bestEdgePct:     edge,
          kellyPct:        kelly,
          overUnder:       enriched.overunder ?? enriched.overUnder ?? leg.selection ?? '',
          matchup:         enriched.matchup ?? '',
          week:            n(enriched.week),
          season:          n(enriched.season),
        });
      }
    }

    const totalLegs = legRecords.length;
    const wonLegs   = legRecords.filter(l => l.won).length;

    // ── 4. Dimension analysis ─────────────────────────────────────────────────

    // Score Diff buckets
    const scoreDiffBuckets = bucketHitRate(
      legRecords.map(l => ({ won: l.won, value: l.scoreDiff ?? null })),
      [
        { label: '< -20',       min: -Infinity, max: -20 },
        { label: '-20 to -10',  min: -20,       max: -10 },
        { label: '-10 to 0',    min: -10,       max: 0   },
        { label: '0 to +10',    min: 0,         max: 10  },
        { label: '+10 to +20',  min: 10,        max: 20  },
        { label: '+20 to +40',  min: 20,        max: 40  },
        { label: '> +40',       min: 40,        max: Infinity },
      ]
    );

    // Confidence buckets
    const confBuckets = bucketHitRate(
      legRecords.map(l => ({ won: l.won, value: l.confidenceScore ?? null })),
      [
        { label: '< 40%',    min: 0,  max: 40 },
        { label: '40–50%',   min: 40, max: 50 },
        { label: '50–60%',   min: 50, max: 60 },
        { label: '60–70%',   min: 60, max: 70 },
        { label: '70–80%',   min: 70, max: 80 },
        { label: '> 80%',    min: 80, max: Infinity },
      ]
    );

    // Opponent rank buckets
    const rankBuckets = bucketHitRate(
      legRecords.map(l => ({ won: l.won, value: l.opponentRank ?? null })),
      [
        { label: 'Elite (1–8)',     min: 1,  max: 9  },
        { label: 'Mid (9–16)',      min: 9,  max: 17 },
        { label: 'Weak (17–24)',    min: 17, max: 25 },
        { label: 'Very Weak (25+)', min: 25, max: 33 },
      ]
    );

    // Edge buckets
    const edgeBuckets = bucketHitRate(
      legRecords.map(l => ({ won: l.won, value: l.bestEdgePct ?? null })),
      [
        { label: 'Negative',  min: -Infinity, max: 0  },
        { label: '0–5%',      min: 0,         max: 5  },
        { label: '5–10%',     min: 5,         max: 10 },
        { label: '10–20%',    min: 10,        max: 20 },
        { label: '> 20%',     min: 20,        max: Infinity },
      ]
    );

    // Kelly buckets
    const kellyBuckets = bucketHitRate(
      legRecords.map(l => ({ won: l.won, value: l.kellyPct ?? null })),
      [
        { label: '< 2%',   min: 0,  max: 2  },
        { label: '2–5%',   min: 2,  max: 5  },
        { label: '5–10%',  min: 5,  max: 10 },
        { label: '> 10%',  min: 10, max: Infinity },
      ]
    );

    // Leg count
    const legCountMap: Record<number, { won: number; total: number }> = {};
    for (const b of betLevelRecords) {
      if (!legCountMap[b.legCount]) legCountMap[b.legCount] = { won: 0, total: 0 };
      legCountMap[b.legCount].total++;
      if (b.won) legCountMap[b.legCount].won++;
    }
    const legCountBuckets = Object.entries(legCountMap)
      .filter(([, v]) => v.total >= 3)
      .map(([count, v]) => ({
        label:   count === '1' ? 'Single' : `${count}-Leg Parlay`,
        count:   Number(count),
        total:   v.total,
        won:     v.won,
        hitRate: pct(v.won, v.total),
      }))
      .sort((a, b) => a.count - b.count);

    // Prop type hit rates
    const propTypeMap: Record<string, { won: number; total: number }> = {};
    for (const l of legRecords) {
      const t = l.prop || 'other';
      if (!propTypeMap[t]) propTypeMap[t] = { won: 0, total: 0 };
      propTypeMap[t].total++;
      if (l.won) propTypeMap[t].won++;
    }
    const propTypeBuckets = Object.entries(propTypeMap)
      .filter(([, v]) => v.total >= 3)
      .map(([prop, v]) => ({ prop, total: v.total, won: v.won, hitRate: pct(v.won, v.total) }))
      .sort((a, b) => (b.hitRate ?? 0) - (a.hitRate ?? 0));

    // Over/Under split
    const ouMap: Record<string, { won: number; total: number }> = { over: { won: 0, total: 0 }, under: { won: 0, total: 0 } };
    for (const l of legRecords) {
      const d = l.overUnder?.toLowerCase();
      if (d === 'over' || d === 'under') {
        ouMap[d].total++;
        if (l.won) ouMap[d].won++;
      }
    }
    const ouSplit = Object.entries(ouMap)
      .filter(([, v]) => v.total >= 3)
      .map(([dir, v]) => ({ dir, total: v.total, won: v.won, hitRate: pct(v.won, v.total) }));

    // Player patterns (min 3 legs)
    const playerMap: Record<string, { won: number; total: number; props: Set<string> }> = {};
    for (const l of legRecords) {
      const p = l.player || 'unknown';
      if (!playerMap[p]) playerMap[p] = { won: 0, total: 0, props: new Set() };
      playerMap[p].total++;
      if (l.won) playerMap[p].won++;
      if (l.prop) playerMap[p].props.add(l.prop);
    }
    const playerPatterns = Object.entries(playerMap)
      .filter(([, v]) => v.total >= 3)
      .map(([player, v]) => ({
        player,
        total:   v.total,
        won:     v.won,
        hitRate: pct(v.won, v.total),
        props:   [...v.props],
      }))
      .sort((a, b) => (b.hitRate ?? 0) - (a.hitRate ?? 0))
      .slice(0, 15);

    // ── 5. Derive sweet spot thresholds ──────────────────────────────────────
    // "Sweet spot" = the bucket with the highest hit rate in each dimension
    // that has a meaningful sample (≥5 legs) and beats overall avg
    const overallHitRate = totalLegs > 0 ? (wonLegs / totalLegs) * 100 : 50;

    function bestBucket<T extends { hitRate: number | null; total: number }>(
      buckets: T[],
      minSample = 5
    ): T | null {
      return buckets
        .filter(b => b.total >= minSample && (b.hitRate ?? 0) > overallHitRate)
        .sort((a, b) => (b.hitRate ?? 0) - (a.hitRate ?? 0))[0] ?? null;
    }

    const sweetSpots = {
      scoreDiff:       bestBucket(scoreDiffBuckets),
      confidence:      bestBucket(confBuckets),
      opponentRank:    bestBucket(rankBuckets),
      edge:            bestBucket(edgeBuckets),
      kelly:           bestBucket(kellyBuckets),
      legCount:        bestBucket(legCountBuckets),
      propType:        bestBucket(propTypeBuckets as any),
      overUnder:       ouSplit.find(o => (o.hitRate ?? 0) > overallHitRate) ?? null,
    };

    // ── 6. Build scoring criteria for the badge ───────────────────────────────
    // Returns the thresholds the frontend uses to score any given prop
    const scoringCriteria = {
      overallHitRate,
      totalLegs,
      wonLegs,
      // Each criterion: { min, max, hitRate, weight }
      scoreDiff: scoreDiffBuckets
        .filter(b => (b.hitRate ?? 0) > overallHitRate)
        .map(b => ({ min: b.min, max: b.max, hitRate: b.hitRate!, label: b.label })),
      confidence: confBuckets
        .filter(b => (b.hitRate ?? 0) > overallHitRate)
        .map(b => ({ min: b.min, max: b.max, hitRate: b.hitRate!, label: b.label })),
      opponentRank: rankBuckets
        .filter(b => (b.hitRate ?? 0) > overallHitRate)
        .map(b => ({ min: b.min, max: b.max, hitRate: b.hitRate!, label: b.label })),
      edge: edgeBuckets
        .filter(b => (b.hitRate ?? 0) > overallHitRate)
        .map(b => ({ min: b.min, max: b.max, hitRate: b.hitRate!, label: b.label })),
      kelly: kellyBuckets
        .filter(b => (b.hitRate ?? 0) > overallHitRate)
        .map(b => ({ min: b.min, max: b.max, hitRate: b.hitRate!, label: b.label })),
      propTypes: propTypeBuckets
        .filter(b => (b.hitRate ?? 0) > overallHitRate)
        .map(b => b.prop),
      preferredOU: ouSplit.find(o => (o.hitRate ?? 0) === Math.max(...ouSplit.map(x => x.hitRate ?? 0)))?.dir ?? null,
      bestLegCount: legCountBuckets.find(b => (b.hitRate ?? 0) === Math.max(...legCountBuckets.map(x => x.hitRate ?? 0)))?.count ?? null,
    };

    return NextResponse.json({
      meta: { totalLegs, wonLegs, overallHitRate: Math.round(overallHitRate * 10) / 10 },
      sweetSpots,
      scoringCriteria,
      dimensions: {
        scoreDiff:  scoreDiffBuckets,
        confidence: confBuckets,
        rank:       rankBuckets,
        edge:       edgeBuckets,
        kelly:      kellyBuckets,
        legCount:   legCountBuckets,
        propType:   propTypeBuckets,
        overUnder:  ouSplit,
      },
      playerPatterns,
    });
  } catch (err: any) {
    console.error('Sweet spots API error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}