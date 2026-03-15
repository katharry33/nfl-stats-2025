#!/usr/bin/env tsx
// scripts/postGameAll.ts
//
// Runs post-game scoring for ALL weeks in allProps_{season} using data
// already stored in Firestore — no PFR scraping needed.
//
// For each prop that has a gameStat stored, this script:
//   1. Computes actualResult  (won/lost) from gameStat vs line + overunder
//   2. Computes scoreDiff     (playerAvg − line)
//   3. Computes profitLoss    if betAmount + bestOdds are present
//   4. Deletes any legacy field names (capitalized variants)
//
// Usage:
//   npx tsx scripts/postGameAll.ts --season=2025
//   npx tsx scripts/postGameAll.ts --season=2024
//   npx tsx scripts/postGameAll.ts --season=2025 --week=18   # single week
//   npx tsx scripts/postGameAll.ts --season=2025 --dry-run   # preview only

import 'dotenv/config';
import { initializeApp, cert, getApps, getApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { FieldValue } from 'firebase-admin/firestore';
import path from 'path';
import fs from 'fs';

// ─── Firebase init ────────────────────────────────────────────────────────────
function getCredential() {
  const key = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (key) { try { return cert(key.startsWith('{') ? JSON.parse(key) : key); } catch {} }
  const projectId   = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey  = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (projectId && clientEmail && privateKey) return cert({ projectId, clientEmail, privateKey });
  const keyPath = path.resolve(process.cwd(), 'serviceAccountKey.json');
  if (fs.existsSync(keyPath)) {
    try { return cert(JSON.parse(fs.readFileSync(keyPath, 'utf-8'))); } catch {}
  }
  return applicationDefault();
}
const app = getApps().length ? getApp()
  : initializeApp({ credential: getCredential(), projectId: process.env.FIREBASE_PROJECT_ID ?? 'studio-8723557452-72ba7' });
const db = getFirestore(app);

// ─── Inlined: determineResult + calculateProfitLoss ───────────────────────────
function determineResult(actualStat: number, line: number, overUnder: string): 'won' | 'lost' | 'push' {
  const ou = overUnder.toLowerCase();
  if (Math.abs(actualStat - line) < 0.001) return 'push';
  if (ou === 'over')  return actualStat > line ? 'won' : 'lost';
  if (ou === 'under') return actualStat < line ? 'won' : 'lost';
  return 'lost';
}
function calculateProfitLoss(betAmount: number, odds: number, result: string): number {
  if (result === 'push') return 0;
  if (result === 'lost') return -betAmount;
  const payout = odds > 0 ? (odds / 100) * betAmount : (100 / Math.abs(odds)) * betAmount;
  return Math.round(payout * 100) / 100;
}

// ─── CLI ──────────────────────────────────────────────────────────────────────
const args    = process.argv.slice(2);
const SEASON  = parseInt(args.find(a => a.startsWith('--season='))?.split('=')[1] ?? '2025', 10);
const WEEK    = args.find(a => a.startsWith('--week='))?.split('=')[1];
const WEEK_N  = WEEK ? parseInt(WEEK, 10) : undefined;
const DRY_RUN = args.includes('--dry-run');

// Legacy keys to delete when we touch a document
const LEGACY_KEYS = [
  'Score Diff', 'Season Hit %', 'actual stats', 'Actual stats', 'Actual Stats',
  'game stats', 'Game Stats', 'Over/Under?', 'Over/Under', 'over under',
  'Player Avg', 'Opponent Rank', 'Opponent Avg vs Stat', 'Confidence Score',
];

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n🏆 Post-Game Batch — season=${SEASON}${WEEK_N ? ` week=${WEEK_N}` : ' all weeks'} dry=${DRY_RUN}`);
  console.log('='.repeat(55));

  const colName = `allProps_${SEASON}`;
  let docs = (await db.collection(colName).get()).docs;

  if (WEEK_N != null) {
    docs = docs.filter(d => {
      const r = d.data();
      return Number(r.week ?? r.Week) === WEEK_N;
    });
  }

  console.log(`📋 ${docs.length} docs loaded`);

  // ── Tally by week ─────────────────────────────────────────────────────────
  const weekCounts: Record<number, { total: number; hasGameStat: number }> = {};
  for (const doc of docs) {
    const r    = doc.data();
    const week = Number(r.week ?? r.Week ?? 0);
    const gs   = r.gameStat ?? r['game stats'] ?? r['Game Stats'] ?? null;
    if (!weekCounts[week]) weekCounts[week] = { total: 0, hasGameStat: 0 };
    weekCounts[week].total++;
    if (gs != null) weekCounts[week].hasGameStat++;
  }

  console.log('\n📊 Week summary:');
  const weeks = Object.keys(weekCounts).map(Number).sort((a, b) => a - b);
  for (const w of weeks) {
    const { total, hasGameStat } = weekCounts[w];
    console.log(`   WK${String(w).padStart(2)}: ${hasGameStat}/${total} have gameStat`);
  }

  // ── Build updates ─────────────────────────────────────────────────────────
  const updates: Array<{ id: string; data: Record<string, any> }> = [];
  let won = 0, lost = 0, noStat = 0, alreadyDone = 0;

  for (const doc of docs) {
    const r = doc.data();

    // Normalise field variants
    const gameStat  = r.gameStat   ?? r['game stats'] ?? r['Game Stats'] ?? null;
    const line      = Number(r.line ?? r.Line ?? 0);
    const ou        = (r.overunder ?? r.overUnder ?? r['Over/Under?'] ?? r['Over/Under'] ?? '').toString();
    const playerAvg = r.playerAvg  ?? r['Player Avg'] ?? null;
    const betAmount = r.betAmount  ?? r['Bet Amount']  ?? null;
    const bestOdds  = r.bestOdds   ?? r['Best Odds']   ?? null;

    if (gameStat == null) { noStat++; continue; }

    // Skip if already scored and not stale
    if (r.actualResult && r.actualResult !== '' && r.scoreDiff != null) {
      alreadyDone++; continue;
    }

    const stat   = Number(gameStat);
    const result = ou ? determineResult(stat, line, ou as 'Over' | 'Under') : null;

    const update: Record<string, any> = {
      gameStat: stat,
    };

    if (result) {
      update.actualResult = result.toLowerCase(); // 'won' or 'lost'
      if (result === 'won') won++; else lost++;
    }

    // scoreDiff = playerAvg − line (pre-game expectation vs line)
    if (playerAvg != null) {
      update.scoreDiff = Math.round((Number(playerAvg) - line) * 10) / 10;
    }

    // P&L
    if (betAmount && bestOdds && result) {
      update.profitLoss = calculateProfitLoss(Number(betAmount), Number(bestOdds), result);
    }

    // Delete legacy keys present on this doc
    for (const k of LEGACY_KEYS) {
      if (r[k] !== undefined) update[k] = FieldValue.delete();
    }

    updates.push({ id: doc.id, data: update });
  }

  console.log(`\n📊 Results:`);
  console.log(`   No gameStat:     ${noStat} (not yet played / not stored)`);
  console.log(`   Already scored:  ${alreadyDone}`);
  console.log(`   Won:             ${won}`);
  console.log(`   Lost:            ${lost}`);
  console.log(`   Updates queued:  ${updates.length}`);

  if (updates.length === 0 || DRY_RUN) {
    console.log(DRY_RUN ? '\n💡 Dry run — nothing written.' : '\n✅ Nothing to write.');
    return;
  }

  // ── Batch write ───────────────────────────────────────────────────────────
  console.log(`\n💾 Writing ${updates.length} docs…`);
  for (let i = 0; i < updates.length; i += 400) {
    const batch = db.batch();
    for (const { id, data } of updates.slice(i, i + 400)) {
      batch.update(db.collection(colName).doc(id), data);
    }
    await batch.commit();
    process.stdout.write(`\r   ${Math.min(i + 400, updates.length)} / ${updates.length}`);
  }

  console.log(`\n\n✅ Done — ${updates.length} props scored.`);
}

main().catch(err => { console.error('❌', err.message ?? err); process.exit(1); });