#!/usr/bin/env tsx
// scripts/enrichFromFirestore.ts
// Self-contained — no @/ imports. All helpers inlined.

import 'dotenv/config';
import { initializeApp, cert, getApps, getApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import path from 'path';
import fs from 'fs';

// ─── Firebase init (same logic as admin.ts) ───────────────────────────────────
function getCredential() {
  const key = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (key) { try { return cert(key.startsWith('{') ? JSON.parse(key) : key); } catch {} }
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (projectId && clientEmail && privateKey) return cert({ projectId, clientEmail, privateKey });
  const keyPath = path.resolve(process.cwd(), 'serviceAccountKey.json');
  if (fs.existsSync(keyPath)) {
    try { return cert(JSON.parse(fs.readFileSync(keyPath, 'utf-8'))); } catch {}
  }
  console.log('🔑 Using applicationDefault');
  return applicationDefault();
}
const app = getApps().length ? getApp()
  : initializeApp({ credential: getCredential(), projectId: process.env.FIREBASE_PROJECT_ID ?? 'studio-8723557452-72ba7' });
const db = getFirestore(app);

// ─── Inlined: normalizeProp ───────────────────────────────────────────────────
function normalizeProp(raw: string): string {
  if (!raw) return '';
  let p = raw.toLowerCase().trim();
  if (p.includes('receiving yard')) return 'rec yds';
  if (p.includes('receiving rec'))  return 'recs';
  if (p.includes('rushing yard'))   return 'rush yds';
  if (p.includes('passing yard'))   return 'pass yds';
  p = p.replace(/\s+/g, ' ').replace(/\s*\+\s*/g, '+');
  p = p.replace(/\byards\b|\byard\b|\byd\b/g, 'yds');
  p = p.replace(/\btouchdowns\b|\btouchdown\b/g, 'tds');
  p = p.replace(/\btd\b(?!s)/g, 'tds');
  const map: Record<string, string> = {
    'pass yds':'pass yds','passing yds':'pass yds','pass att':'pass att',
    'pass cmp':'pass cmp','completions':'pass cmp','pass tds':'pass tds',
    'rush yds':'rush yds','rush att':'rush att','carries':'rush att','rush tds':'rush tds',
    'rec yds':'rec yds','receiving yards':'rec yds',
    'recs':'recs','receptions':'recs','targets':'targets',
    'anytime td':'anytime td','anytime touchdown':'anytime td',
    'pass+rush yds':'pass+rush yds','rush+rec yds':'rush+rec yds',
  };
  return map[p] ?? p;
}

// ─── Inlined: getOpponent ────────────────────────────────────────────────────
function getOpponent(myTeam: string, matchup: string): string | null {
  if (!matchup.includes('@')) return null;
  const [away, home] = matchup.split('@').map(t => t.trim().toUpperCase());
  return myTeam.toUpperCase() === away ? home : away;
}

// ─── Inlined: computeScoring + pickBestOdds ──────────────────────────────────
const DEFAULT_ODDS = -110;

function impliedProbFromOdds(odds: number): number {
  return odds > 0 ? 100 / (odds + 100) : Math.abs(odds) / (Math.abs(odds) + 100);
}
function kellyCap(propNorm: string): number {
  const p = propNorm.toLowerCase();
  if (p.includes('anytime td')) return 0.02;
  if (p.includes('pass tds'))   return 0.05;
  return 0.10;
}
function computeScoring(input: {
  playerAvg: number; opponentRank: number; opponentAvgVsStat: number;
  line: number; seasonHitPct: number | null; odds: number | null; propNorm: string;
}) {
  const { playerAvg, opponentRank, opponentAvgVsStat, line, seasonHitPct, propNorm } = input;
  const odds = (input.odds != null && input.odds !== 0) ? input.odds : DEFAULT_ODDS;

  const yardsScore     = playerAvg * 0.7 + opponentAvgVsStat * 0.3;
  const rankAdjustment = ((opponentRank - 16.5) / 32) * 10;
  const totalScore     = yardsScore + rankAdjustment;
  const scoreDiff      = totalScore - line;
  const scalingFactor  = scoreDiff / 10;
  const winProbability = Math.exp(-scalingFactor);
  const overUnder      = scoreDiff >= 0 ? 'Over' : 'Under';
  const projWinPct     = overUnder === 'Over' ? 1 / (1 + winProbability) : winProbability / (1 + winProbability);
  const avgWinProb     = seasonHitPct != null ? (projWinPct + seasonHitPct) / 2 : null;
  const winProb        = avgWinProb ?? projWinPct;
  const impliedProb    = impliedProbFromOdds(odds);
  const bestEdgePct    = winProb - impliedProb;
  const payout         = odds > 0 ? odds / 100 : 100 / Math.abs(odds);
  const expectedValue  = winProb * payout - (1 - winProb);
  let kellyPct: number | null = null;
  if (bestEdgePct > 0) {
    kellyPct = Math.min((payout * winProb - (1 - winProb)) / payout, kellyCap(propNorm));
  }
  const valueIcon = bestEdgePct > 0.10 ? '🔥' : bestEdgePct > 0.05 ? '⚠️' : '❄️';
  const confidenceScore = seasonHitPct != null
    ? 0.4 * projWinPct + 0.4 * seasonHitPct + 0.2 * (avgWinProb ?? projWinPct)
    : projWinPct;
  const r4 = (v: number) => Math.round(v * 10000) / 10000;
  const r3 = (v: number) => Math.round(v * 1000)  / 1000;
  return {
    yardsScore: r3(yardsScore), rankScore: r3(rankAdjustment), totalScore: r3(totalScore),
    scoreDiff: r3(scoreDiff), scalingFactor: r3(scalingFactor),
    winProbability: r4(winProbability), overUnder, projWinPct: r4(projWinPct),
    avgWinProb: avgWinProb != null ? r4(avgWinProb) : null,
    impliedProb: r4(impliedProb), bestEdgePct: r4(bestEdgePct),
    expectedValue: r4(expectedValue), kellyPct: kellyPct != null ? r4(kellyPct) : null,
    valueIcon, confidenceScore: r4(confidenceScore),
  };
}
function pickBestOdds(fdOdds?: number | null, dkOdds?: number | null) {
  const candidates = [
    { odds: fdOdds ?? null, book: 'FanDuel' },
    { odds: dkOdds ?? null, book: 'DraftKings' },
  ].filter(c => c.odds != null) as { odds: number; book: string }[];
  if (!candidates.length) return { odds: null, book: null };
  candidates.sort((a, b) => {
    const pa = a.odds > 0 ? a.odds / 100 : 100 / Math.abs(a.odds);
    const pb = b.odds > 0 ? b.odds / 100 : 100 / Math.abs(b.odds);
    return pb - pa;
  });
  return { odds: candidates[0].odds, book: candidates[0].book };
}

// ─── CLI args ─────────────────────────────────────────────────────────────────
const args   = process.argv.slice(2);
const SEASON = parseInt(args.find(a => a.startsWith('--season='))?.split('=')[1] ?? '2025', 10);
const WEEK   = args.find(a => a.startsWith('--week='))?.split('=')[1];
const WEEK_N = WEEK ? parseInt(WEEK, 10) : undefined;
const FORCE  = args.includes('--force');

// ─── Static data loaders ──────────────────────────────────────────────────────
async function loadPlayerAvgs(season: number): Promise<Map<string, Record<string, number>>> {
  const snap = await db.collection('static_playerSeasonStats').where('season', '==', season).get();
  const map  = new Map<string, Record<string, number>>();
  for (const doc of snap.docs) {
    const r      = doc.data();
    const player = (r.player ?? '').toLowerCase().trim();
    const games  = Number(r.games ?? 0);
    if (!player || !games) continue;
    const stats: Record<string, number> = {};
    for (const [k, v] of Object.entries(r)) {
      if (['player','team','season','games','_updatedAt'].includes(k)) continue;
      stats[k] = Math.round((Number(v) / games) * 10) / 10;
    }
    map.set(player, stats);
  }
  console.log(`  📊 playerSeasonStats: ${map.size} players (season ${season})`);
  return map;
}

async function loadDefenseStats(season: number): Promise<Map<string, Record<string, number>>> {
  const snap = await db.collection('static_teamDefenseStats').where('season', '==', season).get();
  const map  = new Map<string, Record<string, number>>();
  for (const doc of snap.docs) {
    const r    = doc.data();
    const team = (r.team ?? '').toUpperCase().trim();
    if (!team) continue;
    map.set(team, r as Record<string, number>);
  }
  console.log(`  🛡️  teamDefenseStats:  ${map.size} teams (season ${season})`);
  return map;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n⚡ Firestore-only enrichment — season=${SEASON}${WEEK_N ? ` week=${WEEK_N}` : ''} force=${FORCE}`);
  console.log('='.repeat(55));

  console.log('\n📦 Loading static data…');
  const [playerAvgsCurrent, playerAvgsPrior, defCurrent, defPrior] = await Promise.all([
    loadPlayerAvgs(SEASON),
    loadPlayerAvgs(SEASON - 1),
    loadDefenseStats(SEASON),
    loadDefenseStats(SEASON - 1),
  ]);

  const colName = `allProps_${SEASON}`;
  console.log(`\n📋 Loading ${colName}…`);
  let docs = (await db.collection(colName).get()).docs;
  if (WEEK_N != null) docs = docs.filter(d => (d.data().week ?? d.data().Week) === WEEK_N);
  console.log(`   ${docs.length} docs${WEEK_N ? ` (week ${WEEK_N})` : ''}`);

  const updates: Array<{ id: string; data: Record<string, any> }> = [];
  let skipped = 0, noAvg = 0, noDef = 0, scored = 0;

  for (const doc of docs) {
    const r        = doc.data();
    const player   = (r.player ?? '').toLowerCase().trim();
    const propRaw  = r.prop ?? r.Prop ?? '';
    const propNorm = normalizeProp(propRaw);
    const line     = Number(r.line ?? r.Line ?? 0);
    const week     = Number(r.week ?? r.Week ?? 1);
    const team     = (r.team ?? r.Team ?? '').toUpperCase().trim();
    const matchup  = r.matchup ?? r.Matchup ?? '';
    const fdOdds   = r.fdOdds ?? r.odds ?? null;
    const dkOdds   = r.dkOdds ?? null;
    const isEarly  = week <= 3;

    if (!FORCE && r.confidenceScore != null && r.confidenceScore !== 0) { skipped++; continue; }

    const update: Record<string, any> = {};

    // 1. Player average
    const existingAvg = (r.playerAvg != null && Number(r.playerAvg) !== 0) ? Number(r.playerAvg) : null;
    const statKey     = propNorm.replace(/ /g, '_');
    const avgMap      = isEarly ? playerAvgsPrior : playerAvgsCurrent;
    const fallback    = isEarly ? playerAvgsCurrent : null;
    let staticAvg: number | null = avgMap.get(player)?.[statKey] ?? null;
    if (staticAvg == null && fallback) staticAvg = fallback.get(player)?.[statKey] ?? null;
    let playerAvg: number | null = existingAvg ?? staticAvg ?? null;
    if (playerAvg != null && existingAvg == null) update.playerAvg = playerAvg;
    else if (existingAvg != null) playerAvg = existingAvg;
    if (playerAvg == null) noAvg++;

    // 2. overUnder from avg vs line
    const existingOU = r.overunder ?? r.overUnder ?? '';
    let resolvedOU: 'Over' | 'Under' | null = null;
    if (existingOU === 'Over' || existingOU === 'Under') {
      resolvedOU = existingOU;
    } else if (playerAvg != null) {
      resolvedOU = playerAvg > line ? 'Over' : 'Under';
      update.overunder = resolvedOU;
    }

    // 3. Defense stats
    const opponent = team && matchup ? getOpponent(team, matchup) : null;
    const defMap   = isEarly ? defPrior : defCurrent;
    let opponentRank: number | null = r.opponentRank      ?? null;
    let opponentAvg:  number | null = r.opponentAvgVsStat ?? null;
    if ((opponentRank == null || FORCE) && opponent) {
      const defData = defMap.get(opponent.toUpperCase());
      if (defData) {
        const rank = defData[`${statKey}_rank`] ?? null;
        const avg  = defData[`${statKey}_avg`]  ?? null;
        if (rank != null && avg != null) {
          opponentRank = Number(rank); opponentAvg = Number(avg);
          update.opponentRank = opponentRank; update.opponentAvgVsStat = opponentAvg;
        }
      }
    }
    if (opponentRank == null) noDef++;

    // 4. Score diff
    const avg = update.playerAvg ?? r.playerAvg ?? null;
    if (avg != null) update.scoreDiff = Math.round((Number(avg) - line) * 10) / 10;

    // 5. Scoring
    const pAvg = update.playerAvg ?? r.playerAvg ?? null;
    const oRnk = update.opponentRank      ?? r.opponentRank      ?? null;
    const oAvg = update.opponentAvgVsStat ?? r.opponentAvgVsStat ?? null;
    if (pAvg != null && oRnk != null && oAvg != null) {
      const best    = pickBestOdds(fdOdds, dkOdds);
      const scoring = computeScoring({
        playerAvg: Number(pAvg), opponentRank: oRnk, opponentAvgVsStat: oAvg,
        line, seasonHitPct: r.seasonHitPct ?? null, odds: best.odds, propNorm,
      });
      Object.assign(update, scoring);
      if (best.odds != null) { update.bestOdds = best.odds; update.bestBook = best.book ?? undefined; }
      scored++;
    }

    if (Object.keys(update).length > 0) updates.push({ id: doc.id, data: update });
  }

  console.log(`\n📊 Results:`);
  console.log(`   Total docs:      ${docs.length}`);
  console.log(`   Already done:    ${skipped}`);
  console.log(`   No playerAvg:    ${noAvg}`);
  console.log(`   No defense:      ${noDef}`);
  console.log(`   Scoring queued:  ${scored}`);
  console.log(`   Updates queued:  ${updates.length}`);

  if (updates.length === 0) { console.log('\n✅ Nothing to write.'); return; }

  console.log(`\n💾 Writing ${updates.length} docs in batches…`);
  for (let i = 0; i < updates.length; i += 400) {
    const batch = db.batch();
    for (const { id, data } of updates.slice(i, i + 400)) {
      batch.update(db.collection(colName).doc(id), data);
    }
    await batch.commit();
    process.stdout.write(`\r   ${Math.min(i + 400, updates.length)} / ${updates.length}`);
  }
  console.log(`\n\n✅ Done — ${updates.length} props enriched.`);
}

main().catch(err => { console.error('❌', err.message ?? err); process.exit(1); });