// src/app/api/all-props/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

/**
 * Priority-based collection resolution
 */
function getCollections(league: string, season: string): string[] {
  if (league === 'nba') return [`nbaProps_${season}`];
  return ['allProps', `allProps_${season}`, 'allProps_2024'];
}

/**
 * Dedup key
 */
function dedupKey(d: any): string {
  const player  = (d.player ?? d.playerName ?? '').toLowerCase().trim();
  const matchup = (d.matchup ?? '').toLowerCase().trim();
  const prop    = (d.prop ?? d.propType ?? '').toLowerCase().trim();
  const date    = (d.gameDate ?? d.date ?? '').toLowerCase().trim();
  return `${player}|${matchup}|${prop}|${date}`;
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  const league = (searchParams.get('league') || 'nfl').toLowerCase();
  const season = searchParams.get('season') || '2025';
  const week   = searchParams.get('week');
  let date     = searchParams.get('date'); // <-- let (we may override)
  const offset = parseInt(searchParams.get('offset') || '0', 10);
  const limit  = Math.min(parseInt(searchParams.get('limit') || '50', 10), 500);
  const search = (searchParams.get('search') || '').toLowerCase().trim();

  const collections = getCollections(league, season);
  const allDocs: any[] = [];

  try {
    for (const colName of collections) {
      let q: FirebaseFirestore.Query = adminDb.collection(colName);

      // ─── NBA DATE FALLBACK (KEY FIX) ───────────────────────────────
      if (league === 'nba') {
        if (date) {
          q = q.where('gameDate', '==', date);
        }

        let snap = await q.limit(300).get();

        // 🔥 If no results → fallback to latest available date
        if (snap.empty && date) {
          const latestSnap = await adminDb
            .collection(colName)
            .orderBy('gameDate', 'desc')
            .limit(1)
            .get();

          const latestDate = latestSnap.docs[0]?.data()?.gameDate;

          if (latestDate) {
            console.log(`📅 NBA fallback → using ${latestDate}`);
            date = latestDate;

            q = adminDb
              .collection(colName)
              .where('gameDate', '==', latestDate)
              .limit(300);

            snap = await q.get();
          }
        }

        for (const doc of snap.docs) {
          const data = doc.data();
          if (!(data.player ?? data.playerName)) continue;
          allDocs.push({ id: doc.id, _col: colName, ...data });
        }

        continue; // skip NFL logic
      }

      // ─── NFL LOGIC (UNCHANGED) ────────────────────────────────────
      if (week && week !== 'all') {
        const wNum = parseInt(week, 10);
        const wStr = String(week);
        q = q.where('week', 'in', [wNum, wStr]);
      }

      const snap = await q.limit(300).get();

      for (const doc of snap.docs) {
        const data = doc.data();
        if (!(data.player ?? data.playerName)) continue;
        allDocs.push({ id: doc.id, _col: colName, ...data });
      }
    }

    // ─── DEDUPE ────────────────────────────────────────────────────
    const seen = new Set<string>();
    let deduped = allDocs.filter(d => {
      const key = dedupKey(d);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // ─── SEARCH ────────────────────────────────────────────────────
    if (search) {
      deduped = deduped.filter(d => {
        const player = (d.player ?? d.playerName ?? '').toLowerCase();
        const prop   = (d.prop ?? '').toLowerCase();
        return player.includes(search) || prop.includes(search);
      });
    }

    // ─── NORMALIZATION ─────────────────────────────────────────────
    const normalized = deduped.map(d => ({
      id:                d.id,
      league:            d.league ?? league,
      player:            d.player ?? d.playerName ?? 'Unknown',
      team:              d.team ?? d.Team ?? '',
      prop:              d.prop ?? d.Prop ?? '',
      line:              Number(d.line ?? 0),
      overUnder:         d.overUnder ?? d.selection ?? 'Over',
      odds:              Number(d.odds ?? d.bestOdds ?? -110),
      matchup:           d.matchup ?? '',
      gameDate:          d.gameDate ?? d.date ?? '',
      week:              d.week ?? null,
      season:            d.season ?? season,
      playerAvg:         d.playerAvg ?? null,
      seasonHitPct:      d.seasonHitPct ?? null,
      confidenceScore:   Number(d.confidenceScore ?? 0),
      status:            d.playerAvg ? 'enriched' : 'pending',
    }));

    // ─── SORT ──────────────────────────────────────────────────────
    normalized.sort((a, b) => {
      const weekA = Number(a.week) || 0;
      const weekB = Number(b.week) || 0;
      if (weekB !== weekA) return weekB - weekA;
      return (b.confidenceScore || 0) - (a.confidenceScore || 0);
    });

    const total = normalized.length;
    const page  = normalized.slice(offset, offset + limit);

    return NextResponse.json(page, {
        headers: {
            'X-Actual-Date': date || '',
            'X-Total-Count': String(total)
        } 
    });

  } catch (err: any) {
    console.error('[GET /api/all-props]', err.message);
    return NextResponse.json({ error: 'Failed to load' }, { status: 500 });
  }
}
