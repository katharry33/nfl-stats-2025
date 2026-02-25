// app/api/betting-log/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

const PAGE_SIZE = 25;

// ─── Types ────────────────────────────────────────────────────────────────────

interface NormLeg {
  id:        string;
  player:    string;
  prop:      string;
  line:      number;
  selection: string;
  odds:      number | null;
  matchup:   string;
  week:      number | null;
  status:    string;
  gameDate:  string | null;
  team:      string;
}

interface GroupedBet {
  id:          string;   // parlayId OR doc id for singles
  parlayId:    string | null;
  isParlay:    boolean;
  legs:        NormLeg[];
  legsEmpty:   boolean;  // true for "other docs" with empty legs[]
  week:        number | null;
  status:      string;
  odds:        number | null;
  stake:       number | null;
  createdAt:   string | null;
  _collection: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toISO(val: any): string | null {
  if (!val) return null;
  if (typeof val?.toDate === "function") return val.toDate().toISOString();
  const secs = val?.seconds ?? val?._seconds;
  if (secs != null) return new Date(Number(secs) * 1000).toISOString();
  if (typeof val === "string" && val.length > 0) return val;
  return null;
}

/** Pull leg fields from a root-level leg doc (bettingLog DK legs / betting_logs) */
function legFromRootDoc(data: any, docId: string): NormLeg {
  return {
    id:        docId,
    player:    String(data.player ?? data.playerteam ?? data.Player ?? '').trim(),
    prop:      String(data.prop   ?? data.Prop       ?? '').trim(),
    line:      Number(data.line   ?? data.Line)       || 0,
    selection: String(data.selection ?? data.overUnder ?? data['Over/Under?'] ?? '').trim(),
    odds:      Number(data.odds   ?? data.Odds)       || null,
    matchup:   String(data.matchup ?? data.Matchup   ?? '').trim(),
    week:      Number(data.week   ?? data.Week)       || null,
    status:    String(data.status ?? 'pending').toLowerCase(),
    gameDate:  toISO(data.gameDate ?? data.date ?? data['Game Date']),
    team:      String(data.team   ?? data.Team        ?? '').trim(),
  };
}

/**
 * Groups a flat array of root-level leg docs by parlayId.
 * Docs without a parlayId are treated as single-leg bets.
 */
function groupLegDocs(
  docs: { id: string; data: any; collection: string }[],
  parlayIdField: string = 'parlayId',   // pass the exact field name per collection
): GroupedBet[] {
  const parlayMap = new Map<string, { docs: typeof docs }>();
  const singles:   GroupedBet[] = [];

  for (const doc of docs) {
    const parlayId: string | undefined = doc.data[parlayIdField];

    if (parlayId) {
      if (!parlayMap.has(parlayId)) parlayMap.set(parlayId, { docs: [] });
      parlayMap.get(parlayId)!.docs.push(doc);
    } else {
      // Single-leg bet — root-level doc
      const leg = legFromRootDoc(doc.data, doc.id);
      singles.push({
        id:          doc.id,
        parlayId:    null,
        isParlay:    false,
        legs:        [leg],
        legsEmpty:   false,
        week:        leg.week,
        status:      leg.status,
        odds:        leg.odds,
        stake:       Number(doc.data.stake ?? doc.data.wager) || null,
        createdAt:   toISO(doc.data.createdAt ?? doc.data.updatedAt),
        _collection: doc.collection,
      });
    }
  }

  const parlays: GroupedBet[] = Array.from(parlayMap.entries()).map(([parlayId, { docs: pDocs }]) => {
    const legs = pDocs.map(d => legFromRootDoc(d.data, d.id));
    const first = pDocs[0];
    return {
      id:          parlayId,
      parlayId,
      isParlay:    true,
      legs,
      legsEmpty:   false,
      week:        legs[0]?.week ?? null,
      status:      String(first.data.status ?? 'pending').toLowerCase(),
      odds:        Number(first.data.parlayOdds ?? first.data.odds) || null,
      stake:       Number(first.data.stake ?? first.data.wager)     || null,
      createdAt:   toISO(first.data.createdAt ?? first.data.updatedAt),
      _collection: first.collection,
    };
  });

  return [...parlays, ...singles];
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const week    = searchParams.get('week')   ?? '';
    const status  = searchParams.get('status') ?? '';
    const cursor  = searchParams.get('cursor') ?? '';
    const limit   = Math.min(parseInt(searchParams.get('limit') ?? String(PAGE_SIZE)), 100);

    console.log('📥 betting-log GET', { week, status, cursor, limit });

    const weekNum = week && week !== 'all' ? parseInt(week, 10) : null;

    // ── 1. bettingLog ─────────────────────────────────────────────────────────
    //    Two sub-types: DK leg docs (root fields, parlayId) + "other" parlay docs
    //    with empty legs[]. We fetch all and separate them by whether legs[] exists.

    const bettingLogRaw:  { id: string; data: any; collection: string }[] = [];
    const otherParlay:    GroupedBet[] = [];

    try {
      let q: FirebaseFirestore.Query = adminDb.collection('bettingLog');
      if (weekNum !== null) q = q.where('week', '==', weekNum);
      if (status && status !== 'all') q = q.where('status', '==', status);
      // No orderBy — combining where + orderBy requires a composite index

      const snap = await q.limit(1000).get();
      console.log(`  📦 bettingLog: ${snap.size} docs`);

      for (const doc of snap.docs) {
        const data = doc.data();

        // "Other docs" — have a legs array but it's empty
        if (Array.isArray(data.legs) && data.legs.length === 0) {
          otherParlay.push({
            id:          doc.id,
            parlayId:    data.parlayid ?? null,   // bettingLog uses all-lowercase
            isParlay:    true,
            legs:        [],
            legsEmpty:   true,
            week:        Number(data.week)   || null,
            status:      String(data.status ?? 'pending').toLowerCase(),
            odds:        Number(data.odds)   || null,
            stake:       Number(data.stake ?? data.wager) || null,
            createdAt:   toISO(data.createdAt ?? data.updatedAt),
            _collection: 'bettingLog',
          });
        } else {
          // DK leg docs — root-level fields, will be grouped by parlayId below
          bettingLogRaw.push({ id: doc.id, data, collection: 'bettingLog' });
        }
      }
    } catch (e: any) {
      console.error('  ❌ bettingLog:', e.message);
    }

    // ── 2. betting_logs ───────────────────────────────────────────────────────
    //    Individual leg docs grouped by parlayId

    const bettingLogsRaw: { id: string; data: any; collection: string }[] = [];

    try {
      let q: FirebaseFirestore.Query = adminDb.collection('betting_logs');
      if (weekNum !== null) q = q.where('week', '==', weekNum);
      if (status && status !== 'all') q = q.where('status', '==', status);
      // No orderBy — combining where + orderBy requires a composite index

      const snap = await q.limit(1000).get();
      console.log(`  📦 betting_logs: ${snap.size} docs`);

      for (const doc of snap.docs) {
        bettingLogsRaw.push({ id: doc.id, data: doc.data(), collection: 'betting_logs' });
      }
    } catch (e: any) {
      console.error('  ❌ betting_logs:', e.message);
    }

    // ── 3. Group + merge ──────────────────────────────────────────────────────

    // bettingLog DK docs use all-lowercase 'parlayid'
    // betting_logs uses camelCase 'parlayId'
    const fromBettingLog  = groupLegDocs(bettingLogRaw,  'parlayid');
    const fromBettingLogs = groupLegDocs(bettingLogsRaw, 'parlayId');

    let allBets: GroupedBet[] = [
      ...fromBettingLog,
      ...fromBettingLogs,
      ...otherParlay,
    ];

    // Dedupe by id
    const seen = new Set<string>();
    allBets = allBets.filter(b => {
      if (seen.has(b.id)) return false;
      seen.add(b.id);
      return true;
    });

    // Sort by date desc
    allBets.sort((a, b) => {
      const da = new Date(a.createdAt ?? 0).getTime();
      const db = new Date(b.createdAt ?? 0).getTime();
      return db - da;
    });

    // ── 4. Paginate ───────────────────────────────────────────────────────────

    const startIdx   = cursor ? allBets.findIndex(b => b.id === cursor) + 1 : 0;
    const page       = allBets.slice(startIdx, startIdx + limit);
    const hasMore    = allBets.length > startIdx + limit;
    const nextCursor = hasMore ? page[page.length - 1]?.id ?? null : null;

    console.log(`✅ Returning ${page.length}/${allBets.length} grouped bets`);

    return NextResponse.json({
      bets: page,
      hasMore,
      nextCursor,
      total: page.length,
      debug: {
        bettingLog:       fromBettingLog.length,
        bettingLogs:      fromBettingLogs.length,
        otherParlay:      otherParlay.length,
        totalGrouped:     allBets.length,
      },
    });

  } catch (err: any) {
    console.error('❌ betting-log fatal:', err);
    return NextResponse.json({ error: err.message, bets: [], hasMore: false }, { status: 500 });
  }
}