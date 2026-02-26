#!/usr/bin/env tsx
// scripts/loadProps.ts
// Fetches props from Odds API and saves to Firestore
//
// Usage:
//   tsx scripts/loadProps.ts --week=14
//   WEEK=14 tsx scripts/loadProps.ts

import { initializeApp, cert, getApps } from 'firebase-admin/app';

// ── Firebase init (must happen before any firestore imports) ──────────────────
if (!getApps().length) {
  const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (keyPath) {
    initializeApp({ credential: cert(keyPath) });
  } else if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)) });
  } else {
    throw new Error(
      'Set GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_SERVICE_ACCOUNT_KEY'
    );
  }
}

import { formatMatchup, formatDate, formatTime, normalizeProp } from '@/lib/enrichment/normalize';
import { saveProps } from '@/lib/enrichment/firestore';
import { pickBestOdds } from '@/lib/enrichment/scoring';
// Import NFLProp from @/lib/types (the canonical source) so gameDate etc. exist
import type { NFLProp } from '@/lib/types';

const ODDS_API_KEY = process.env.ODDS_API_KEY!;
const SEASON = 2025;

const WEEK_STARTS: Record<number, Date> = {
  1:  new Date('2025-09-04T00:00:00Z'),
  2:  new Date('2025-09-11T00:00:00Z'),
  3:  new Date('2025-09-18T00:00:00Z'),
  4:  new Date('2025-09-25T00:00:00Z'),
  5:  new Date('2025-10-02T00:00:00Z'),
  6:  new Date('2025-10-09T00:00:00Z'),
  7:  new Date('2025-10-16T00:00:00Z'),
  8:  new Date('2025-10-23T00:00:00Z'),
  9:  new Date('2025-10-30T00:00:00Z'),
  10: new Date('2025-11-06T00:00:00Z'),
  11: new Date('2025-11-13T00:00:00Z'),
  12: new Date('2025-11-20T00:00:00Z'),
  13: new Date('2025-11-27T00:00:00Z'),
  14: new Date('2025-12-04T00:00:00Z'),
  15: new Date('2025-12-11T00:00:00Z'),
  16: new Date('2025-12-18T00:00:00Z'),
  17: new Date('2025-12-25T00:00:00Z'),
  18: new Date('2026-01-01T00:00:00Z'),
  19: new Date('2026-01-08T00:00:00Z'),
  20: new Date('2026-01-15T00:00:00Z'),
  21: new Date('2026-01-22T00:00:00Z'),
  22: new Date('2026-02-05T00:00:00Z'),
};

const MARKETS = [
  'player_receptions', 'player_reception_yds', 'player_rush_attempts',
  'player_rush_yds', 'player_pass_attempts', 'player_pass_completions',
  'player_pass_tds', 'player_pass_yds', 'player_anytime_td',
  'player_pass_rush_yds', 'player_rush_reception_yds',
] as const;

const MARKET_TO_PROP: Record<string, string> = {
  player_receptions: 'Receptions', player_reception_yds: 'Rec Yards',
  player_rush_attempts: 'Rush Attempts', player_rush_yds: 'Rush Yards',
  player_pass_attempts: 'Pass Attempts', player_pass_completions: 'Pass Completions',
  player_pass_tds: 'Pass TDs', player_pass_yds: 'Pass Yards',
  player_anytime_td: 'Anytime TD', player_pass_rush_yds: 'Pass + Rush Yards',
  player_rush_reception_yds: 'Rush + Rec Yards',
};

async function main() {
  if (!ODDS_API_KEY) throw new Error('ODDS_API_KEY is not set in .env');

  const weekArg = process.argv.find(a => a.startsWith('--week='))?.split('=')[1] ?? process.env.WEEK;
  if (!weekArg) { console.error('Usage: tsx scripts/loadProps.ts --week=14'); process.exit(1); }

  const week = parseInt(weekArg, 10);
  if (isNaN(week) || week < 1 || week > 22) { console.error('Invalid week (1-22)'); process.exit(1); }

  // FIX: use \n escape instead of a literal newline inside a single-quoted string
  console.log('\n🏈 Loading props — Week ' + week + ', Season ' + SEASON);
  console.log('='.repeat(50));

  const start = WEEK_STARTS[week];
  if (!start) throw new Error(`No date range for week ${week}`);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);

  const eventsRes = await fetch(
    `https://api.the-odds-api.com/v4/sports/americanfootball_nfl/events?apiKey=${ODDS_API_KEY}`
  );
  const events: any[] = await eventsRes.json();
  const weekEvents = events.filter(e => {
    const t = new Date(e.commence_time);
    return t >= start && t < end;
  });

  console.log(`📅 Found ${weekEvents.length} games for Week ${week}`);

  const allProps: NFLProp[] = [];

  for (let i = 0; i < weekEvents.length; i++) {
    const event = weekEvents[i];
    if (i > 0 && i % 3 === 0) await sleep(2000);

    const matchup  = formatMatchup(event.away_team, event.home_team);
    const gameDate = formatDate(new Date(event.commence_time));
    const gameTime = formatTime(new Date(event.commence_time));

    const oddsAccum = new Map<string, { fd?: number; dk?: number; line?: number; prop?: string }>();

    for (const market of MARKETS) {
      try {
        const url =
          `https://api.the-odds-api.com/v4/sports/americanfootball_nfl/events/${event.id}/odds?` +
          `apiKey=${ODDS_API_KEY}&regions=us&markets=${market}&bookmakers=fanduel,draftkings`;

        const res = await fetch(url);
        if (!res.ok) continue;
        const data: any = await res.json();
        const propLabel = MARKET_TO_PROP[market] ?? market;

        for (const bm of (data.bookmakers ?? [])) {
          const mkt = bm.markets?.[0];
          if (!mkt?.outcomes) continue;
          for (const outcome of mkt.outcomes) {
            if (outcome.name !== 'Over') continue;
            const player: string = outcome.description?.trim() ?? '';
            if (!player) continue;
            const key = `${player}||${propLabel}`;
            if (!oddsAccum.has(key)) {
              oddsAccum.set(key, {
                line: market === 'player_anytime_td' ? 0.5 : (outcome.point ?? 0),
                prop: propLabel,
              });
            }
            const entry = oddsAccum.get(key)!;
            if (bm.key === 'fanduel')    entry.fd = outcome.price;
            if (bm.key === 'draftkings') entry.dk = outcome.price;
          }
        }
        await sleep(300);
      } catch { /* skip failed market */ }
    }

    for (const [key, data] of oddsAccum) {
      const [player] = key.split('||');
      const best = pickBestOdds(data.fd, data.dk);

      allProps.push({
        // MANDATORY CORE FIELDS (PascalCase)
        id: `${SEASON}-${week}-${player}-${data.prop}`.replace(/\s+/g, '-'), 
        Player: player,
        Team: '', // Script doesn't have team data yet, providing empty string
        Prop: data.prop ?? '',
        Line: data.line ?? 0,
        'Over/Under?': 'Over', // Odds API "point" usually refers to the Over

        // APP ALIASES (camelCase)
        week,
        season: String(SEASON),
        gameDate,
        gameTime,
        matchup,
        player, // Alias for Player
        team: '', // Alias for Team
        prop: data.prop ?? '', // Alias for Prop
        line: data.line ?? 0, // Alias for Line

        // ENRICHMENT
        bestOdds: best.odds ?? undefined,
        bestBook: best.book ?? undefined,
      });
    }

    console.log(`  ${i + 1}/${weekEvents.length}: ${event.away_team} @ ${event.home_team} → +${oddsAccum.size} props`);
  }

  const saved = await saveProps(allProps);
  // FIX: use \n escape instead of literal newline in single-quoted string
  console.log('\n' + '='.repeat(50));
  console.log(`✅ Done: ${allProps.length} fetched, ${saved} new props saved to Firestore`);
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

main().catch(err => { console.error('❌', err); process.exit(1); });