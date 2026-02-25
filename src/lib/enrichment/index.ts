// packages/nfl-enrichment/src/loadProps.ts

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

const ODDS_API_KEY = process.env.ODDS_API_KEY!;
const SEASON = 2025;

const db = getFirestore();

const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

// ─── ODDS API ──────────────────────────────────────────────

export async function loadPropsForWeek(week: number) {
  const events = await fetchNFLEvents();
  const weekRange = getWeekDateRange(week);
  
  const weekEvents = events.filter(e => {
    const t = new Date(e.commence_time);
    return t >= weekRange.start && t < weekRange.end;
  });

  console.log(`Found ${weekEvents.length} games for Week ${week}`);

  const batch = db.batch();
  let count = 0;

  for (const event of weekEvents) {
    const props = await fetchPropsForEvent(event);
    
    for (const prop of props) {
      const ref = db
        .collection('seasons').doc(String(SEASON))
        .collection('weeks').doc(String(week))
        .collection('props').doc();
      
      batch.set(ref, {
        ...prop,
        week,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      count++;
    }
  }

  await batch.commit();
  console.log(`✅ Loaded ${count} props for Week ${week}`);
  return count;
}

async function fetchNFLEvents() {
  const url = `https://api.the-odds-api.com/v4/sports/americanfootball_nfl/events?apiKey=${ODDS_API_KEY}`;
  const res = await fetch(url);
  return res.json() as Promise<any[]>;
}

async function fetchPropsForEvent(event: any) {
  const markets = [
    'player_receptions', 'player_reception_yds', 'player_rush_yds',
    'player_pass_yds', 'player_pass_tds', 'player_anytime_td',
    'player_rush_reception_yds', 'player_pass_rush_yds'
  ];

  const props: any[] = [];

  for (const market of markets) {
    try {
      const url = `https://api.the-odds-api.com/v4/sports/americanfootball_nfl/events/${event.id}/odds?` +
        `apiKey=${ODDS_API_KEY}&regions=us&markets=${market}&bookmakers=draftkings,fanduel`;
      
      const res = await fetch(url);
      if (!res.ok) continue;
      
      const data: any = await res.json();
      const parsed = parseOddsResponse(data, event, market);
      props.push(...parsed);

      await sleep(300);
    } catch (err) {
      console.warn(`Skipping ${market}:`, err);
    }
  }

  return props;
}

function parseOddsResponse(data: any, event: any, marketKey: string) {
  if (!data?.bookmakers?.length) return [];

  const matchup = formatMatchup(event.away_team, event.home_team);
  const gameDate = event.commence_time 
    ? new Date(event.commence_time).toISOString().split('T')[0] 
    : '';
  const gameTime = event.commence_time
    ? formatTime(new Date(event.commence_time))
    : '';

  const props: any[] = [];
  const propLabel = marketToProp(marketKey);

  // Collect odds from all bookmakers
  const bookOdds: Record<string, { dk?: number; fd?: number }> = {};

  for (const bm of data.bookmakers) {
    const market = bm.markets?.[0];
    if (!market?.outcomes) continue;

    for (const outcome of market.outcomes) {
      const player = outcome.description?.trim() || '';
      const side = outcome.name; // "Over" or "Under"
      if (side !== 'Over') continue;

      if (!bookOdds[player]) bookOdds[player] = {};
      if (bm.key === 'draftkings') bookOdds[player].dk = outcome.price;
      if (bm.key === 'fanduel') bookOdds[player].fd = outcome.price;
    }
  }

  // Use first bookmaker for line
  const primary = data.bookmakers[0];
  const primaryMarket = primary?.markets?.[0];
  if (!primaryMarket?.outcomes) return [];

  const seen = new Set<string>();
  for (const outcome of primaryMarket.outcomes) {
    const player = outcome.description?.trim() || '';
    if (!player || seen.has(player)) continue;
    if (outcome.name !== 'Over') continue;
    seen.add(player);

    const odds = bookOdds[player] || {};
    const bestOdds = pickBestOdds(odds.fd, odds.dk);

    props.push({
      gameDate,
      gameTime,
      matchup,
      player,
      team: '',
      prop: propLabel,
      line: marketKey === 'player_anytime_td' ? 0.5 : (outcome.point || 0),
      fdOdds: odds.fd || null,
      dkOdds: odds.dk || null,
      bestOdds: bestOdds.odds || null,
      bestBook: bestOdds.book || null,
      // Enrichment fields (filled later)
      playerAvg: null,
      opponentRank: null,
      opponentAvgVsStat: null,
      seasonHitPct: null,
      projWinPct: null,
      actualResult: null,
      gameStat: null,
    });
  }

  return props;
}