// src/lib/enrichment/schedule.ts
//
// Looks up game date and time from the static_schedule Firestore collection.
// Also provides overUnder inference for props that have an empty overUnder field.

import { db } from '@/lib/firebase/admin';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ScheduleGame {
  week:      number;
  season:    number;
  homeTeam:  string;
  awayTeam:  string;
  gameDate:  string; // "YYYY-MM-DD"
  gameTime?: string; // "1:00 PM" etc.
  matchup:   string; // "AWAY @ HOME"
}

// ─── In-memory cache — keyed by "season:week" ────────────────────────────────

const scheduleCache = new Map<string, ScheduleGame[]>();

/**
 * Load all games for a given season+week from static_schedule.
 * Results are cached in memory for the lifetime of the process.
 */
export async function getScheduleForWeek(
  season: number,
  week:   number,
): Promise<ScheduleGame[]> {
  const key = `${season}:${week}`;
  if (scheduleCache.has(key)) return scheduleCache.get(key)!;

  const snap = await db.collection('static_schedule')
    .where('season', '==', season)
    .where('week',   '==', week)
    .get();

  const games: ScheduleGame[] = snap.docs.map(d => {
    const r = d.data();

    // Handle multiple possible field name formats from different schedule imports
    const pick = (...keys: string[]) => {
      for (const k of keys) { const v = r[k]; if (v != null && v !== '') return v; }
      return null;
    };

    const homeTeam = (pick('homeTeam', 'home_team', 'Home', 'home') ?? '').toString().toUpperCase().trim();
    const awayTeam = (pick('awayTeam', 'away_team', 'Away', 'away') ?? '').toString().toUpperCase().trim();

    // Normalise the date — Firestore Timestamp or ISO string
    const rawDate = pick('game date', 'gameDate', 'game_date', 'date', 'Date');
    let gameDate  = '';
    if (rawDate) {
      if (typeof rawDate === 'string') {
        gameDate = rawDate.split('T')[0];
      } else if (rawDate?.toDate) {
        gameDate = rawDate.toDate().toISOString().split('T')[0];
      }
    }

    const gameTime = pick('game time', 'gameTime', 'game_time', 'time', 'Time') ?? '';
    const matchup  = `${awayTeam} @ ${homeTeam}`;

    return {
      week:    r.week   ?? week,
      season:  r.season ?? season,
      homeTeam,
      awayTeam,
      gameDate,
      gameTime: gameTime ? String(gameTime) : undefined,
      matchup,
    };
  });

  scheduleCache.set(key, games);
  return games;
}

/**
 * Find the schedule entry that matches a prop's matchup string.
 * Handles "NO @ GB", "no @ gb", "NO@GB" — all normalised before comparison.
 */
export async function getGameForMatchup(
  matchup: string,
  season:  number,
  week:    number,
): Promise<ScheduleGame | null> {
  const games = await getScheduleForWeek(season, week);
  if (!games.length) return null;

  // Normalise both sides: uppercase, remove spaces around @
  const norm = (s: string) => s.toUpperCase().replace(/\s*@\s*/, '@').trim();
  const target = norm(matchup);

  return games.find(g => norm(g.matchup) === target) ?? null;
}

// ─── overUnder inference ──────────────────────────────────────────────────────

/**
 * For historical props that have an empty overUnder field, infer the direction
 * from the prop type. This is a best-effort fallback — yardage / reception props
 * are almost exclusively offered as Over/Under with Over being the most common
 * bet direction. We default to 'Over' and flag it so it can be corrected.
 *
 * Props that have no meaningful over/under (e.g. "first touchdown scorer") return null.
 */
export function inferOverUnder(propNorm: string): 'Over' | 'Under' | null {
  const yardageProps = ['pass yds', 'rush yds', 'rec yds', 'pass+rush yds', 'rush+rec yds'];
  const countProps   = ['recs', 'pass att', 'pass cmp', 'rush att', 'targets'];
  const tdProps      = ['pass tds', 'rush tds', 'rec tds', 'anytime td'];

  if (yardageProps.some(p => propNorm.includes(p))) return 'Over';
  if (countProps.some(p => propNorm.includes(p)))   return 'Over';
  if (tdProps.some(p => propNorm.includes(p)))      return 'Over';

  return null; // unknown prop type — leave empty rather than guess
}