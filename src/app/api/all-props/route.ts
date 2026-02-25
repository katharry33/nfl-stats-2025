// app/api/all-props/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

const PAGE_SIZE = 50;

// ── NFL week → approximate game-week start date ───────────────────────────────
// Used to derive a display date for allProps_2024 which has no gameDate field.

const WEEK_STARTS: Record<number, Record<number, string>> = {
  2025: {
    1: '2025-09-07', 2: '2025-09-14', 3: '2025-09-21', 4: '2025-09-28',
    5: '2025-10-05', 6: '2025-10-12', 7: '2025-10-19', 8: '2025-10-26',
    9: '2025-11-02', 10: '2025-11-09', 11: '2025-11-16', 12: '2025-11-23',
    13: '2025-11-30', 14: '2025-12-07', 15: '2025-12-14', 16: '2025-12-21',
    17: '2025-12-28', 18: '2026-01-04', 19: '2026-01-10', 20: '2026-01-17',
    21: '2026-01-25', 22: '2026-02-08',
  },
  2024: {
    1: '2024-09-08', 2: '2024-09-15', 3: '2024-09-22', 4: '2024-09-29',
    5: '2024-10-06', 6: '2024-10-13', 7: '2024-10-20', 8: '2024-10-27',
    9: '2024-11-03', 10: '2024-11-10', 11: '2024-11-17', 12: '2024-11-24',
    13: '2024-12-01', 14: '2024-12-08', 15: '2024-12-15', 16: '2024-12-22',
    17: '2024-12-29', 18: '2025-01-05', 19: '2025-01-11', 20: '2025-01-18',
    21: '2025-01-26', 22: '2025-02-09',
  },
};

function weekToDate(week: number | null | undefined, season: number): string | null {
  if (!week) return null;
  return WEEK_STARTS[season]?.[week] ?? null;
}

// ── Timestamp helpers ─────────────────────────────────────────────────────────

function toISO(val: any): string | null {
  if (!val) return null;
  if (typeof val?.toDate === "function") return val.toDate().toISOString();
  const secs = val?.seconds ?? val?._seconds;
  if (secs != null) return new Date(Number(secs) * 1000).toISOString();
  if (typeof val === "string" && val.length > 0) return val;
  return null;
}

// ── Per-schema normalisers ────────────────────────────────────────────────────
//
// CRITICAL: allProps_2025 uses PascalCase field names (Player, Prop, Line,
// Week, Matchup, Team, Game Date, Over/Under?, Actual Result, Odds).
// Firestore queries are case-sensitive — querying 'week' on this collection
// returns zero results. We must use the exact field name per schema.

function normalise2025(raw: any, docId: string) {
  const week = Number(raw.Week) || null;
  return {
    id:          docId,
    _collection: 'allProps_2025',
    player:      String(raw.Player        ?? '').trim(),
    prop:        String(raw.Prop          ?? '').trim(),
    line:        Number(raw.Line)         || 0,
    matchup:     String(raw.Matchup       ?? '').trim(),
    week,
    // allProps_2025 has a real gameDate field
    gameDate:    toISO(raw['Game Date'] ?? raw['game date']) ?? toISO(raw._updatedAt),
    team:        String(raw.Team          ?? '').trim(),
    odds:        Number(raw.Odds)         || null,
    actualResult: raw['Actual Result']    ?? null,
    season:      2025,
    createdAt:   toISO(raw._updatedAt ?? raw['Game Date']),
  };
}

function normalise2024(raw: any, docId: string) {
  const week   = Number(raw.week) || null;
  const season = Number(raw.season) || 2024;
  return {
    id:          docId,
    _collection: 'allProps_2024',
    player:      String(raw.player   ?? '').trim(),
    prop:        String(raw.prop     ?? '').trim(),
    line:        Number(raw.line)    || 0,
    matchup:     String(raw.matchup  ?? '').trim(),
    week,
    // allProps_2024 has NO gameDate — derive from week
    gameDate:    weekToDate(week, season),
    team:        String(raw.team     ?? '').trim(),
    odds:        null,
    actualResult: null,
    season,
    createdAt:   toISO(raw.createdAt ?? raw.updatedAt ?? raw.migratedAt),
  };
}

function normaliseBets(raw: any, docId: string) {
  // Flat or nested legs — pull first leg for display
  const leg    = Array.isArray(raw.legs) && raw.legs.length ? raw.legs[0] : raw;
  const week   = Number(raw.week ?? leg.week) || null;
  return {
    id:          docId,
    _collection: 'bets_2025',
    player:      String(leg.player ?? raw.player ?? '').trim(),
    prop:        String(leg.prop   ?? raw.prop   ?? '').trim(),
    line:        Number(leg.line   ?? raw.line)  || 0,
    matchup:     String(leg.matchup?? raw.matchup?? '').trim(),
    week,
    // bets_2025 uses 'date' as the game date field
    gameDate:    toISO(raw.date) ?? weekToDate(week, 2025),
    team:        String(leg.team   ?? raw.team   ?? '').trim(),
    odds:        Number(leg.odds   ?? raw.odds)  || null,
    actualResult: raw.status       ?? null,
    season:      2025,
    createdAt:   toISO(raw.createdAt ?? raw.date),
  };
}

// ── Route ─────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const player = (searchParams.get('player') ?? '').trim();
    const prop   = (searchParams.get('prop')   ?? '').trim();
    const week   = (searchParams.get('week')   ?? '').trim();
    const cursor =  searchParams.get('cursor');
    const limit  = Math.min(parseInt(searchParams.get('limit') ?? String(PAGE_SIZE)), 200);

    console.log('📥 all-props GET', { player, prop, week, cursor, limit });

    const weekNum = week && week !== 'all' ? parseInt(week, 10) : null;

    // ── Collection definitions
    // week_field: the EXACT Firestore field name for week in that collection
    const collections = [
      { name: 'allProps_2025', schema: '2025' as const, weekField: 'Week'  },
      { name: 'allProps_2024', schema: '2024' as const, weekField: 'week'  },
      { name: 'bets_2025',     schema: 'bets' as const, weekField: 'week'  }, // update if different
    ];

    const allNorm: ReturnType<typeof normalise2025>[] = [];

    for (const cfg of collections) {
      try {
        let q: FirebaseFirestore.Query = adminDb.collection(cfg.name);

        // ── Server-side week filter using the CORRECT field name per schema
        // NOTE: Do NOT add orderBy here — combining where() + orderBy() on
        // different fields requires a Firestore composite index. Without one
        // the entire query throws and returns zero results.
        // We sort everything in-memory after the merge instead.
        if (weekNum !== null && !isNaN(weekNum)) {
          q = q.where(cfg.weekField, '==', weekNum);
        }

        const snap = await q.limit(500).get();
        console.log(`  📦 ${cfg.name} (week=${weekNum ?? 'all'}): ${snap.size} docs`);

        for (const doc of snap.docs) {
          const raw = doc.data();
          let norm: any;
          switch (cfg.schema) {
            case '2025': norm = normalise2025(raw, doc.id); break;
            case '2024': norm = normalise2024(raw, doc.id); break;
            case 'bets': norm = normaliseBets(raw, doc.id); break;
          }
          if (norm) allNorm.push(norm);
        }
      } catch (err: any) {
        console.error(`  ❌ ${cfg.name}:`, err.message);
      }
    }

    // ── Client-side player / prop filters (applied after merge)
    let filtered = allNorm as any[];

    if (player) {
      const lc = player.toLowerCase();
      filtered = filtered.filter(p => p.player.toLowerCase().includes(lc));
    }

    if (prop && prop !== 'all') {
      const lc = prop.toLowerCase().replace(/\s+/g, '');
      filtered = filtered.filter(p =>
        p.prop.toLowerCase().replace(/\s+/g, '') === lc,
      );
    }

    // ── Sort by date desc
    filtered.sort((a, b) => {
      const da = new Date(a.createdAt ?? 0).getTime();
      const db = new Date(b.createdAt ?? 0).getTime();
      return db - da;
    });

    // ── Cursor pagination
    const startIdx   = cursor ? filtered.findIndex(p => p.id === cursor) + 1 : 0;
    const page       = filtered.slice(startIdx, startIdx + limit);
    const hasMore    = filtered.length > startIdx + limit;
    const nextCursor = hasMore ? page[page.length - 1]?.id ?? null : null;

    console.log(`✅ Returning ${page.length}/${filtered.length} (hasMore=${hasMore})`);

    return NextResponse.json({
      props:      page,
      hasMore,
      nextCursor,
      total:      page.length,
      debug: {
        totalMerged:  allNorm.length,
        afterFilters: filtered.length,
        weekFilter:   weekNum,
        collections:  collections.map(c => c.name),
      },
    });

  } catch (err: any) {
    console.error('❌ all-props fatal:', err);
    return NextResponse.json(
      { error: err.message, props: [], hasMore: false },
      { status: 500 },
    );
  }
}