#!/usr/bin/env tsx
// scripts/loadProps.ts

import { initializeApp, cert, getApps } from 'firebase-admin/app';

if (!getApps().length) {
  const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (keyPath) {
    initializeApp({ credential: cert(keyPath) });
  } else if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)) });
  } else {
    throw new Error('Set GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_SERVICE_ACCOUNT_KEY');
  }
}

import { fetchBettingProsProps } from '@/lib/enrichment/bettingpros';
import { saveProps, getPlayerTeamMap } from '@/lib/enrichment/firestore';
import { normalizePlayerName } from '@/lib/enrichment/normalize';
import type { NFLProp } from '@/lib/types';

// BettingPros returns this shape; optional fields added by richer scrapers
interface ScrapedProp {
  player: string;
  propType: string;
  recommendation: string;
  rating: number;
  line?: number;
  matchup?: string;
  gameDate?: string;
  gameTime?: string;
  fdOdds?: number;
  dkOdds?: number;
}

async function main() {
  const weekArg   = process.argv.find(a => a.startsWith('--week='))?.split('=')[1]   ?? process.env.WEEK;
  const seasonArg = process.argv.find(a => a.startsWith('--season='))?.split('=')[1] ?? process.env.SEASON ?? '2025';

  if (!weekArg) { console.error('Usage: tsx scripts/loadProps.ts --week=14'); process.exit(1); }

  const week   = parseInt(weekArg, 10);
  const season = parseInt(seasonArg, 10);
  if (isNaN(week) || isNaN(season)) { console.error('Invalid week or season'); process.exit(1); }

  console.log(`\n🏈 Loading Props — Week ${week}, Season ${season}`);
  console.log('='.repeat(50));

  console.log('📡 Scraping BettingPros...');
  const scraped = (await fetchBettingProsProps()) as ScrapedProp[];
  console.log(`   ${scraped.length} raw props scraped`);

  if (!scraped.length) {
    console.warn('⚠️  No props scraped — check BettingPros selectors');
    process.exit(0);
  }

  const playerTeamMap = await getPlayerTeamMap();

  const props: NFLProp[] = scraped
    .filter(s => s.player && s.propType)
    .map(s => {
      const team = playerTeamMap[normalizePlayerName(s.player)] ?? '';

      // Parse line from recommendation if not provided directly ("Over 24.5" → 24.5)
      const lineFromRec = s.recommendation
        ? parseFloat(s.recommendation.replace(/over|under/i, '').trim())
        : NaN;
      const line     = s.line ?? (isNaN(lineFromRec) ? 0 : lineFromRec);
      const overUnder = s.recommendation?.toLowerCase().includes('under') ? 'Under' : 'Over';

      return {
        player:            s.player.trim(),
        team,
        prop:              s.propType.trim(),
        line,
        overUnder,
        matchup:           s.matchup,
        week,
        season,                           // number — NFLProp.season is number | string
        gameDate:          s.gameDate,
        gameTime:          s.gameTime,
        fdOdds:            s.fdOdds,
        dkOdds:            s.dkOdds,
        expertStars:       typeof s.rating === 'number' ? s.rating : undefined,
        confidenceScore:   typeof s.rating === 'number' ? s.rating * 20 : undefined,
        // Enrichment fields — enrich.ts fills these
        bestOdds:          undefined,
        bestBook:          undefined,
        playerAvg:         undefined,
        opponentRank:      undefined,
        opponentAvgVsStat: undefined,
        seasonHitPct:      undefined,
        projWinPct:        undefined,
        bestEdgePct:       undefined,
        valueIcon:         undefined,
        // Post-game fields — postGame.ts fills these
        actualResult:      'pending' as const,
        gameStat:          undefined,
        betAmount:         undefined,
        profitLoss:        undefined,
      } satisfies NFLProp;
    });

  console.log(`✅ ${props.length} props normalized`);
  const saved = await saveProps(props);

  console.log('\n' + '='.repeat(50));
  console.log(`✅ Done: ${saved} props saved to weeklyProps_${season}/${week}/props`);
}

main().catch(err => { console.error('❌', err); process.exit(1); });