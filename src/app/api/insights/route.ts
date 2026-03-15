// src/app/api/insights/route.ts
import { db } from '@/lib/firebase/admin';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function norm(v: any): number | null {
  const x = Number(v);
  return v == null || isNaN(x) ? null : x;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const seasonParam = searchParams.get('season'); // 'all' | '2024' | '2025'

    const seasons = seasonParam === '2024' ? [2024]
      : seasonParam === '2025' ? [2025]
      : [2024, 2025];

    // Load both seasons in parallel
    const snapshots = await Promise.all(
      seasons.map(s =>
        db.collection(`allProps_${s}`)
          .where('actualResult', 'in', ['won', 'lost'])
          .get()
      )
    );

    const allDocs = snapshots.flatMap(snap => snap.docs.map(d => ({ id: d.id, ...d.data() })));

    // ── Aggregation buckets ───────────────────────────────────────────────────

    // 1. Per player×prop hit rate
    const playerPropMap = new Map<string, {
      player: string; prop: string; won: number; total: number;
      lines: number[]; confScores: number[]; edges: number[];
      overUnders: string[]; weeks: number[];
    }>();

    // 2. Prop type patterns
    const propTypeMap = new Map<string, { won: number; total: number; overWon: number; overTotal: number; underWon: number; underTotal: number }>();

    // 3. Confidence score buckets (0-40, 40-55, 55-65, 65-75, 75-100)
    const confBuckets: Record<string, { won: number; total: number }> = {
      '0–40': { won: 0, total: 0 },
      '40–55': { won: 0, total: 0 },
      '55–65': { won: 0, total: 0 },
      '65–75': { won: 0, total: 0 },
      '75+': { won: 0, total: 0 },
    };

    // 4. Opponent rank buckets (1-8 easy, 9-16 mid, 17-32 tough)
    const rankBuckets: Record<string, { won: number; total: number }> = {
      'Elite (1–8)': { won: 0, total: 0 },
      'Mid (9–16)': { won: 0, total: 0 },
      'Weak (17–24)': { won: 0, total: 0 },
      'Very Weak (25+)': { won: 0, total: 0 },
    };

    // 5. Score diff buckets
    const scoreDiffBuckets: Record<string, { won: number; total: number }> = {
      '< -20': { won: 0, total: 0 },
      '-20 to -10': { won: 0, total: 0 },
      '-10 to 0': { won: 0, total: 0 },
      '0 to +10': { won: 0, total: 0 },
      '+10 to +20': { won: 0, total: 0 },
      '> +20': { won: 0, total: 0 },
    };

    // 6. Weekly hit rate trend
    const weekMap = new Map<number, { won: number; total: number; season: number }>();

    // 7. Edge accuracy (bestEdgePct buckets)
    const edgeBuckets: Record<string, { won: number; total: number }> = {
      'Negative': { won: 0, total: 0 },
      '0–5%': { won: 0, total: 0 },
      '5–10%': { won: 0, total: 0 },
      '10%+': { won: 0, total: 0 },
    };

    // ── Process docs ──────────────────────────────────────────────────────────
    for (const doc of allDocs) {
      const d = doc as any;
      const player     = (d.player ?? '').trim();
      const prop       = (d.prop ?? '').trim();
      const result     = (d.actualResult ?? '').toLowerCase();
      const isWon      = result === 'won';
      const ou         = (d.overunder ?? d.overUnder ?? '').toLowerCase();
      const line       = norm(d.line);
      const week       = norm(d.week);
      const season     = norm(d.season) ?? 2025;
      const conf       = norm(d.confidenceScore);
      const confPct    = conf != null ? (conf <= 1 ? conf * 100 : conf) : null;
      const rank       = norm(d.opponentRank);
      const scoreDiff  = norm(d.scoreDiff);
      const edge       = norm(d.bestEdgePct);
      const edgePct    = edge != null ? (edge <= 1 ? edge * 100 : edge) : null;

      if (!player || !prop || !['won', 'lost'].includes(result)) continue;

      // 1. Player×prop
      const key = `${player}||${prop}`;
      if (!playerPropMap.has(key)) {
        playerPropMap.set(key, { player, prop, won: 0, total: 0, lines: [], confScores: [], edges: [], overUnders: [], weeks: [] });
      }
      const pp = playerPropMap.get(key)!;
      pp.total++;
      if (isWon) pp.won++;
      if (line != null) pp.lines.push(line);
      if (confPct != null) pp.confScores.push(confPct);
      if (edgePct != null) pp.edges.push(edgePct);
      if (ou) pp.overUnders.push(ou);
      if (week != null) pp.weeks.push(week);

      // 2. Prop type
      if (!propTypeMap.has(prop)) {
        propTypeMap.set(prop, { won: 0, total: 0, overWon: 0, overTotal: 0, underWon: 0, underTotal: 0 });
      }
      const pt = propTypeMap.get(prop)!;
      pt.total++;
      if (isWon) pt.won++;
      if (ou === 'over')  { pt.overTotal++;  if (isWon) pt.overWon++;  }
      if (ou === 'under') { pt.underTotal++; if (isWon) pt.underWon++; }

      // 3. Confidence buckets
      if (confPct != null) {
        const bucket = confPct < 40 ? '0–40' : confPct < 55 ? '40–55' : confPct < 65 ? '55–65' : confPct < 75 ? '65–75' : '75+';
        confBuckets[bucket].total++;
        if (isWon) confBuckets[bucket].won++;
      }

      // 4. Opponent rank
      if (rank != null) {
        const bucket = rank <= 8 ? 'Elite (1–8)' : rank <= 16 ? 'Mid (9–16)' : rank <= 24 ? 'Weak (17–24)' : 'Very Weak (25+)';
        rankBuckets[bucket].total++;
        if (isWon) rankBuckets[bucket].won++;
      }

      // 5. Score diff
      if (scoreDiff != null) {
        const bucket = scoreDiff < -20 ? '< -20' : scoreDiff < -10 ? '-20 to -10' : scoreDiff < 0 ? '-10 to 0'
          : scoreDiff < 10 ? '0 to +10' : scoreDiff < 20 ? '+10 to +20' : '> +20';
        scoreDiffBuckets[bucket].total++;
        if (isWon) scoreDiffBuckets[bucket].won++;
      }

      // 6. Weekly trend
      if (week != null) {
        const wk = week as number;
        if (!weekMap.has(wk)) weekMap.set(wk, { won: 0, total: 0, season: season as number });
        const wm = weekMap.get(wk)!;
        wm.total++;
        if (isWon) wm.won++;
      }

      // 7. Edge
      if (edgePct != null) {
        const bucket = edgePct < 0 ? 'Negative' : edgePct < 5 ? '0–5%' : edgePct < 10 ? '5–10%' : '10%+';
        edgeBuckets[bucket].total++;
        if (isWon) edgeBuckets[bucket].won++;
      }
    }

    // ── Format outputs ────────────────────────────────────────────────────────

    const pct = (won: number, total: number) =>
      total > 0 ? Math.round((won / total) * 1000) / 10 : 0;

    // Player patterns (min 3 games)
    const playerPatterns = [...playerPropMap.values()]
      .filter(p => p.total >= 3)
      .map(p => ({
        player: p.player,
        prop:   p.prop,
        hitRate: pct(p.won, p.total),
        won:     p.won,
        total:   p.total,
        avgLine: p.lines.length ? Math.round(p.lines.reduce((a, b) => a + b) / p.lines.length * 10) / 10 : null,
        avgConf: p.confScores.length ? Math.round(p.confScores.reduce((a, b) => a + b) / p.confScores.length) : null,
        avgEdge: p.edges.length ? Math.round(p.edges.reduce((a, b) => a + b) / p.edges.length * 10) / 10 : null,
        dominantOU: p.overUnders.length
          ? (p.overUnders.filter(x => x === 'over').length >= p.overUnders.length / 2 ? 'Over' : 'Under')
          : null,
      }))
      .sort((a, b) => b.hitRate - a.hitRate);

    // Prop type summary (min 5 games)
    const propTypeSummary = [...propTypeMap.entries()]
      .filter(([, v]) => v.total >= 5)
      .map(([prop, v]) => ({
        prop,
        hitRate:     pct(v.won, v.total),
        total:       v.total,
        won:         v.won,
        overHitRate: pct(v.overWon, v.overTotal),
        overTotal:   v.overTotal,
        underHitRate: pct(v.underWon, v.underTotal),
        underTotal:  v.underTotal,
      }))
      .sort((a, b) => b.total - a.total);

    // Confidence accuracy
    const confAccuracy = Object.entries(confBuckets)
      .filter(([, v]) => v.total >= 5)
      .map(([bucket, v]) => ({ bucket, hitRate: pct(v.won, v.total), total: v.total, won: v.won }));

    // Opponent rank impact
    const rankImpact = Object.entries(rankBuckets)
      .filter(([, v]) => v.total >= 5)
      .map(([bucket, v]) => ({ bucket, hitRate: pct(v.won, v.total), total: v.total, won: v.won }));

    // Score diff impact
    const scoreDiffImpact = Object.entries(scoreDiffBuckets)
      .filter(([, v]) => v.total >= 5)
      .map(([bucket, v]) => ({ bucket, hitRate: pct(v.won, v.total), total: v.total, won: v.won }));

    // Weekly trend (sorted by week)
    const weeklyTrend = [...weekMap.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([week, v]) => ({ week, hitRate: pct(v.won, v.total), total: v.total, won: v.won, season: v.season }));

    // Edge accuracy
    const edgeAccuracy = Object.entries(edgeBuckets)
      .filter(([, v]) => v.total >= 5)
      .map(([bucket, v]) => ({ bucket, hitRate: pct(v.won, v.total), total: v.total, won: v.won }));

    // Top-line stats
    const totalWon   = allDocs.filter((d: any) => (d.actualResult ?? '').toLowerCase() === 'won').length;
    const totalScoredProps = allDocs.filter((d: any) => ['won','lost'].includes((d.actualResult ?? '').toLowerCase())).length;
    const overallHitRate = pct(totalWon, totalScoredProps);

    return NextResponse.json({
      meta: {
        totalProps: allDocs.length,
        scoredProps: totalScoredProps,
        overallHitRate,
        seasons,
      },
      playerPatterns,
      propTypeSummary,
      confAccuracy,
      rankImpact,
      scoreDiffImpact,
      weeklyTrend,
      edgeAccuracy,
    });
  } catch (err: any) {
    console.error('Insights API error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}