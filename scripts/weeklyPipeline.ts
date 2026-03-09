#!/usr/bin/env tsx
// scripts/weeklyPipeline.ts
// ─────────────────────────────────────────────────────────────────────────────
// Full weekly pipeline — run manually or schedule via cron / Cloud Scheduler
//
// Usage:
//   tsx scripts/weeklyPipeline.ts --week=14 --season=2025
//   tsx scripts/weeklyPipeline.ts --week=14 --season=2025 --skip-load
//   tsx scripts/weeklyPipeline.ts --week=14 --season=2025 --skip-post-game
//   tsx scripts/weeklyPipeline.ts --week=14 --season=2025 --force   (re-enrich already enriched)
//
// Steps:
//   1. loadProps    — scrape BettingPros → weeklyProps_{season}
//   2. enrich       — PFR avg + defense stats + scoring formulas + hit %
//   3. postGame     — write actual results → move to allProps_{season} → clear weekly
// ─────────────────────────────────────────────────────────────────────────────

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

import { fetchBettingProsProps }   from '@/lib/enrichment/bettingpros';
import { saveProps, getPlayerTeamMap, weeklyPropsRef, movePropsToAllProps } from '@/lib/enrichment/firestore';
import { normalizePlayerName }     from '@/lib/enrichment/normalize';
import { enrichPropsForWeek }      from '@/lib/enrichment/enrichProps';
import { writeActualResults }      from '@/scripts/postGame';  // you may need to export this
import type { NFLProp }            from '@/lib/types';

// ─── CLI args ─────────────────────────────────────────────────────────────────
function arg(name: string) {
  return process.argv.find(a => a.startsWith(`--${name}=`))?.split('=')[1];
}
function flag(name: string) {
  return process.argv.includes(`--${name}`);
}

const weekArg   = arg('week')   ?? process.env.WEEK;
const seasonArg = arg('season') ?? process.env.SEASON ?? '2025';

if (!weekArg) {
  console.error('Usage: tsx scripts/weeklyPipeline.ts --week=14 [--season=2025]');
  process.exit(1);
}

const week        = parseInt(weekArg, 10);
const season      = parseInt(seasonArg, 10);
const skipLoad    = flag('skip-load');
const skipEnrich  = flag('skip-enrich');
const skipPost    = flag('skip-post-game');
const forceEnrich = flag('force');   // re-run even if already enriched

// ─── Helpers ──────────────────────────────────────────────────────────────────
function section(title: string) {
  console.log(`\n${'─'.repeat(55)}`);
  console.log(`  ${title}`);
  console.log('─'.repeat(55));
}

function elapsed(start: number) {
  const ms = Date.now() - start;
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}

// ─── Step 1: Load Props ───────────────────────────────────────────────────────
async function stepLoadProps() {
  section(`STEP 1 — Load Props  (Week ${week}, Season ${season})`);
  const t = Date.now();

  const scraped = await fetchBettingProsProps() as any[];
  console.log(`📡 ${scraped.length} raw props scraped from BettingPros`);

  if (!scraped.length) {
    console.warn('⚠️  No props scraped — check BettingPros selectors');
    return 0;
  }

  const playerTeamMap = await getPlayerTeamMap();

  const props: NFLProp[] = scraped
    .filter(s => s.player && s.propType)
    .map(s => {
      const team = playerTeamMap[normalizePlayerName(s.player)] ?? '';
      const lineFromRec = s.recommendation
        ? parseFloat(s.recommendation.replace(/over|under/i, '').trim())
        : NaN;
      const line      = s.line ?? (isNaN(lineFromRec) ? 0 : lineFromRec);
      const overUnder = s.recommendation?.toLowerCase().includes('under') ? 'Under' : 'Over';

      return {
        player:            s.player.trim(),
        team,
        prop:              s.propType.trim(),
        line,
        overUnder,
        matchup:           s.matchup,
        week,
        season,
        gameDate:          s.gameDate,
        gameTime:          s.gameTime,
        fdOdds:            s.fdOdds,
        dkOdds:            s.dkOdds,
        expertStars:       typeof s.rating === 'number' ? s.rating : undefined,
        confidenceScore:   typeof s.rating === 'number' ? s.rating * 20 : undefined,
        actualResult:      'pending' as const,
      } satisfies NFLProp;
    });

  const saved = await saveProps(props);
  console.log(`✅ ${saved} props saved  (${elapsed(t)})`);
  return saved;
}

// ─── Step 2: Enrich ───────────────────────────────────────────────────────────
async function stepEnrich() {
  section(`STEP 2 — Enrich  (Week ${week})`);
  const t = Date.now();
  const count = await enrichPropsForWeek({
    week,
    season,
    skipEnriched: !forceEnrich,
  });
  console.log(`✅ ${count} props enriched  (${elapsed(t)})`);
  return count;
}

// ─── Step 3: Post-game results ────────────────────────────────────────────────
async function stepPostGame() {
  section(`STEP 3 — Post-Game Results  (Week ${week})`);
  const t = Date.now();

  // writeActualResults is the inner logic from postGame.ts
  // If not exported separately, this step logs a reminder
  try {
    // @ts-ignore — import dynamically to avoid crash if function not yet exported
    const { writeActualResults: fn } = await import('./postGame');
    if (typeof fn === 'function') {
      const result = await fn(week, season);
      console.log(`✅ Post-game complete  (${elapsed(t)})`);
      return result;
    }
  } catch {}

  console.log(`ℹ️  Run separately: tsx scripts/postGame.ts --week=${week} --season=${season}`);
  return 0;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const totalStart = Date.now();

  console.log(`\n${'═'.repeat(55)}`);
  console.log(`  🏈  WEEKLY PIPELINE — Week ${week}, Season ${season}`);
  if (skipLoad)    console.log('  ⚡ --skip-load');
  if (skipEnrich)  console.log('  ⚡ --skip-enrich');
  if (skipPost)    console.log('  ⚡ --skip-post-game');
  if (forceEnrich) console.log('  🔁 --force (re-enriching all)');
  console.log('═'.repeat(55));

  const results = { loaded: 0, enriched: 0, postGame: 0 };

  if (!skipLoad)   results.loaded   = await stepLoadProps();
  if (!skipEnrich) results.enriched = await stepEnrich();
  if (!skipPost)   results.postGame = await stepPostGame();

  console.log(`\n${'═'.repeat(55)}`);
  console.log('  ✅  PIPELINE COMPLETE');
  console.log(`     Loaded:   ${results.loaded}`);
  console.log(`     Enriched: ${results.enriched}`);
  console.log(`     Total:    ${elapsed(totalStart)}`);
  console.log('═'.repeat(55));
}

main().catch(err => {
  console.error('\n❌ Pipeline failed:', err);
  process.exit(1);
});