#!/usr/bin/env tsx
// scripts/find-missing-nba-ids.ts
//
// Scans nbaProps_{season} for players missing bdlId or brid,
// bulk-resolves them via BDL, generates BBRef ID guesses,
// and writes new entries to static_nbaIdMap + static_brIdMap.
//
// Run whenever new players appear in props (trades, call-ups, matchups):
//   npx tsx scripts/find-missing-nba-ids.ts
//   npx tsx scripts/find-missing-nba-ids.ts --season=2025
//   npx tsx scripts/find-missing-nba-ids.ts --dry-run   (print only, no writes)

import 'dotenv/config';
import { initializeApp, cert, getApps, getApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
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
const app = getApps().length
  ? getApp()
  : initializeApp({ credential: getCredential(), projectId: process.env.FIREBASE_PROJECT_ID ?? 'studio-8723557452-72ba7' });
const db = getFirestore(app);

// ─── BDL config ───────────────────────────────────────────────────────────────
const BDL_KEY  = process.env.BALLDONTLIE_API_KEY ?? '';
const BDL_BASE = 'https://api.balldontlie.io/v1';

// ─── CLI args ─────────────────────────────────────────────────────────────────
const args   = process.argv.slice(2);
const SEASON = parseInt(args.find(a => a.startsWith('--season='))?.split('=')[1] ?? '2025', 10);
const DRY    = args.includes('--dry-run');

// ─── BBRef ID guesser ─────────────────────────────────────────────────────────
// Generates a candidate BBRef ID from a player name using the standard formula:
// first 5 chars of last name + first 2 of first name + 01
// This is a guess — always verify at:
//   https://www.basketball-reference.com/players/<letter>/<brid>.html

function guessBrid(fullName: string): string {
  // Strip suffixes
  const clean = fullName.replace(/\s+(Jr\.|Sr\.|III|II|IV)\.?\s*$/i, '').trim();
  const parts = clean.split(' ');
  if (parts.length < 2) return '';

  const firstName = parts[0].toLowerCase().replace(/[^a-z]/g, '');
  // Last name = everything after first name, joined (handles hyphenated)
  const lastName  = parts.slice(1).join('').toLowerCase().replace(/[^a-z]/g, '');

  const lastPart  = lastName.slice(0, 5).padEnd(5, 'x').slice(0, 5);
  const firstPart = firstName.slice(0, 2).padEnd(2, 'x').slice(0, 2);

  return `${lastPart}${firstPart}01`;
}

// ─── BDL bulk fetch ───────────────────────────────────────────────────────────

async function fetchAllBdlPlayers(): Promise<Map<string, number>> {
  const nameToId = new Map<string, number>();
  let cursor: number | null = null;
  let pages = 0;

  process.stdout.write('  📡 Fetching BDL player index');

  while (pages < 60) {
    const url = new URL(`${BDL_BASE}/players`);
    url.searchParams.set('per_page', '100');
    if (cursor) url.searchParams.set('cursor', String(cursor));

    const res = await fetch(url.toString(), { headers: { Authorization: BDL_KEY } });

    if (res.status === 429) {
      process.stdout.write(' ⏳ rate limited, waiting 65s...');
      await sleep(65_000);
      continue;
    }
    if (!res.ok) { console.error(`\n  ❌ BDL /players HTTP ${res.status}`); break; }

    const json = await res.json();
    for (const p of json.data ?? []) {
      const full = `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim();
      if (full) nameToId.set(full.toLowerCase(), p.id);
    }

    cursor = json.meta?.next_cursor ?? null;
    pages++;
    process.stdout.write('.');
    if (!cursor) break;
    await sleep(1000);
  }

  console.log(` done (${nameToId.size} players)`);
  return nameToId;
}

function matchBdlPlayer(fullName: string, nameToId: Map<string, number>): number | null {
  const norm = (s: string) => s.toLowerCase().replace(/['\.]/g, '').replace(/\s+/g, ' ').trim();
  const target = norm(fullName);

  for (const [name, id] of nameToId) {
    if (norm(name) === target) return id;
  }

  // Strip suffix and retry
  const noSuffix = norm(fullName.replace(/\s+(jr|sr|iii|ii|iv)\.?\s*$/i, ''));
  for (const [name, id] of nameToId) {
    if (norm(name) === noSuffix) return id;
  }

  // First name + last name core match
  const parts = target.split(' ');
  if (parts.length >= 2) {
    const fn = parts[0];
    const ln = parts[parts.length - 1].split('-')[0];
    for (const [name, id] of nameToId) {
      const np = norm(name).split(' ');
      if (np[0] === fn && norm(np[np.length - 1]).startsWith(ln)) return id;
    }
  }

  return null;
}

// ─── Team guesser ─────────────────────────────────────────────────────────────
// Infers team from matchup field in props docs

function guessTeam(playerName: string, propDocs: any[]): string {
  // Find all docs for this player and look at their team field
  const playerDocs = propDocs.filter(d =>
    (d.player ?? '').toLowerCase() === playerName.toLowerCase()
  );

  // Use team field if set
  const withTeam = playerDocs.find(d => d.team && d.team !== 'null');
  if (withTeam?.team) return withTeam.team;

  return 'UNK';
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🔍 NBA Missing ID Finder — season=${SEASON}${DRY ? ' (DRY RUN)' : ''}`);
  console.log('='.repeat(55));

  // 1. Load existing ID maps
  const [nbaSnap, brSnap] = await Promise.all([
    db.collection('static_nbaIdMap').get(),
    db.collection('static_brIdMap').get(),
  ]);

  const existingBdl = new Set<string>();
  const existingBr  = new Set<string>();

  nbaSnap.docs.forEach(d => {
    const r = d.data();
    if (r.player && r.bdlId != null) existingBdl.add(r.player.toLowerCase().trim());
  });
  brSnap.docs.forEach(d => {
    const r = d.data();
    if (r.player && r.brid) existingBr.add(r.player.toLowerCase().trim());
  });

  console.log(`\n📚 Existing: ${existingBdl.size} BDL IDs, ${existingBr.size} BR IDs`);

  // 2. Scan props for players missing IDs
  console.log(`\n📋 Scanning nbaProps_${SEASON}...`);
  const propsSnap = await db.collection(`nbaProps_${SEASON}`).get();

  const allPropDocs = propsSnap.docs.map(d => d.data());
  const playerNames = new Set<string>();

  for (const d of allPropDocs) {
    const name = (d.player ?? '').trim();
    if (name) playerNames.add(name);
  }

  const missingBdl: string[] = [];
  const missingBr:  string[] = [];

  for (const name of playerNames) {
    const key = name.toLowerCase().trim();
    if (!existingBdl.has(key)) missingBdl.push(name);
    if (!existingBr.has(key))  missingBr.push(name);
  }

  if (missingBdl.length === 0 && missingBr.length === 0) {
    console.log('\n✅ All players in props have IDs — nothing to do.\n');
    return;
  }

  console.log(`\n⚠️  Missing BDL IDs: ${missingBdl.length}`);
  console.log(`⚠️  Missing BR IDs:  ${missingBr.length}`);

  // 3. BDL bulk lookup for missing players
  const resolvedBdl = new Map<string, number>();

  if (missingBdl.length > 0 && BDL_KEY) {
    console.log('\n🔎 Resolving BDL IDs via bulk fetch...\n');
    const nameToId = await fetchAllBdlPlayers();

    for (const name of missingBdl) {
      const id = matchBdlPlayer(name, nameToId);
      if (id) {
        resolvedBdl.set(name, id);
        console.log(`  ✅ ${name.padEnd(28)} bdlId: ${id}`);
      } else {
        console.log(`  ❌ ${name.padEnd(28)} bdlId: NOT FOUND`);
      }
    }
  } else if (missingBdl.length > 0) {
    console.log('\n⚠️  BALLDONTLIE_API_KEY not set — skipping BDL lookup');
  }

  // 4. Generate BBRef ID guesses for missing BR IDs
  const guessedBr = new Map<string, string>();

  if (missingBr.length > 0) {
    console.log('\n🔤 BBRef ID guesses (verify before trusting):\n');
    for (const name of missingBr) {
      const guess = guessBrid(name);
      guessedBr.set(name, guess);
      const url = `https://www.basketball-reference.com/players/${guess[0]}/${guess}.html`;
      console.log(`  ${name.padEnd(28)} brid: ${guess.padEnd(14)} → ${url}`);
    }
    console.log('\n  ⚠️  Open each URL to verify before trusting these guesses.');
  }

  if (DRY) {
    console.log('\n🔍 DRY RUN — no writes. Remove --dry-run to write to Firestore.\n');
    return;
  }

  // 5. Write new entries to Firestore
  const newPlayers = new Set([...missingBdl, ...missingBr]);
  if (newPlayers.size === 0) {
    console.log('\n✅ Nothing to write.\n');
    return;
  }

  console.log(`\n💾 Writing ${newPlayers.size} new player entries...`);

  const batch = db.batch();
  const now   = new Date().toISOString();

  for (const name of newPlayers) {
    const bdlId = resolvedBdl.get(name) ?? null;
    const brid  = guessedBr.get(name)  ?? null;
    const team  = guessTeam(name, allPropDocs);

    // static_nbaIdMap
    batch.set(
      db.collection('static_nbaIdMap').doc(name),
      {
        player: name, playerName: name,
        team, teamAbbreviation: team,
        bdlId,
        brid:  brid ?? null,
        bbrId: brid ?? null,
        updatedAt: now,
      },
      { merge: true },
    );

    // static_brIdMap (only if we have a brid guess)
    if (brid) {
      batch.set(
        db.collection('static_brIdMap').doc(name),
        { player: name, brid, updatedAt: now },
        { merge: true },
      );
    }
  }

  await batch.commit();
  console.log(`✅ Written to Firestore`);

  // 6. Print summary for seed-nba-ids.ts backfill
  console.log('\n📋 Add these to seed-nba-ids.ts PLAYERS array (verify brids first):\n');
  for (const name of newPlayers) {
    const bdlId = resolvedBdl.get(name) ?? null;
    const brid  = guessedBr.get(name)  ?? 'VERIFY';
    const team  = guessTeam(name, allPropDocs);
    console.log(`  { player: '${name}', team: '${team}', bdlId: ${bdlId ?? 'null'}, brid: '${brid}', brConf: 'low' },`);
  }
  console.log('');
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

main().catch(err => { console.error('❌', err.message ?? err); process.exit(1); });