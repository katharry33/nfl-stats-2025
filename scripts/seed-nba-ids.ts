#!/usr/bin/env tsx
// scripts/seed-nba-ids.ts
//
// Populates TWO Firestore collections in one run:
//   static_nbaIdMap  — bdlId, team, brid (pipeline fields)
//                      + playerName, teamAbbreviation, bbrId (Data Hub UI fields)
//   static_brIdMap   — player, brid, updatedAt
//
// Modes:
//   npx tsx scripts/seed-nba-ids.ts             → seed both collections from hardcoded map
//   npx tsx scripts/seed-nba-ids.ts --lookup    → resolve missing BDL IDs via API first, then seed
//   npx tsx scripts/seed-nba-ids.ts --verify    → check every BBRef URL (slow — 2.5s per player)
//   npx tsx scripts/seed-nba-ids.ts --lookup --verify → full check then seed

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
  : initializeApp({
      credential: getCredential(),
      projectId:  process.env.FIREBASE_PROJECT_ID ?? 'studio-8723557452-72ba7',
    });
const db = getFirestore(app);

// ─── BallDontLie config ───────────────────────────────────────────────────────
const BDL_API_KEY  = '4fb66b96-1044-4635-9bcc-55b6b4668e07';
const BDL_BASE = 'https://api.balldontlie.io/v1';

// ─── Player manifest ──────────────────────────────────────────────────────────
// bdlId: null  → will be resolved by --lookup flag if BALLDONTLIE_API_KEY is set.
//               Run with --lookup first, then hardcode the resolved IDs here.
// team:  3-letter abbreviation matching defense.ts + schedule lookups.
// brid:  Basketball Reference ID (verified via seed-br-ids.ts --verify).
//
// ⚠️  TEAM NOTE: Reflects rosters as of early 2025.
//    Luka Doncic → LAL (traded Feb 2025)
//    De'Aaron Fox → GSW (traded Feb 2025)
//    Update teams here when trades occur — run script again to push changes.
// ─────────────────────────────────────────────────────────────────────────────

interface PlayerEntry {
  player:    string;
  team:      string;
  bdlId:     number | null; // numeric BDL ID — null until --lookup resolves it
  brid:      string;        // BBRef ID
  brConf:    'high' | 'medium' | 'low';
}

const PLAYERS: PlayerEntry[] = [
  { player: 'Shai Gilgeous-Alexander', team: 'OKC', bdlId: 175,        brid: 'gilgesh01', brConf: 'high' },
  { player: 'Luka Doncic',             team: 'LAL', bdlId: 132,        brid: 'doncilu01', brConf: 'high' },
  { player: 'Nikola Jokic',            team: 'DEN', bdlId: 246,        brid: 'jokicni01', brConf: 'high' },
  { player: 'Stephen Curry',           team: 'GSW', bdlId: 115,        brid: 'curryst01', brConf: 'high' },
  { player: 'LeBron James',            team: 'LAL', bdlId: 237,        brid: 'jamesle01', brConf: 'high' },
  { player: 'Kevin Durant',            team: 'PHX', bdlId: 140,        brid: 'duranke01', brConf: 'high' },
  { player: 'James Harden',            team: 'LAC', bdlId: 192,        brid: 'hardeja01', brConf: 'high' },
  { player: 'Kawhi Leonard',           team: 'LAC', bdlId: 274,        brid: 'leonaka01', brConf: 'high' },
  { player: 'Donovan Mitchell',        team: 'CLE', bdlId: 322,        brid: 'mitchdo01', brConf: 'high' },
  { player: 'Devin Booker',            team: 'PHX', bdlId: 57,         brid: 'bookede01', brConf: 'high' },
  { player: 'Jamal Murray',            team: 'DEN', bdlId: 335,        brid: 'murrayja01', brConf: 'high' },
  { player: 'Karl-Anthony Towns',      team: 'NYK', bdlId: 447,        brid: 'townska01', brConf: 'high' },
  { player: 'Bam Adebayo',             team: 'MIA', bdlId: 4,          brid: 'adebaba01', brConf: 'high' },
  { player: 'De\'Aaron Fox',           team: 'GSW', bdlId: 161,        brid: 'foxdea01',  brConf: 'high' },
  { player: 'Anthony Edwards',         team: 'MIN', bdlId: 3547258,    brid: 'edwaran01', brConf: 'medium' },
  { player: 'Tyrese Maxey',            team: 'PHI', bdlId: 3547254,    brid: 'maxeyty01', brConf: 'medium' },
  { player: 'Jaylen Brown',            team: 'BOS', bdlId: 70,         brid: 'brownja02', brConf: 'medium' },
  { player: 'Jalen Brunson',           team: 'NYK', bdlId: 73,         brid: 'brunsja01', brConf: 'medium' },
  { player: 'Cade Cunningham',         team: 'DET', bdlId: 17896075,   brid: 'cunnica01', brConf: 'medium' },
  { player: 'LaMelo Ball',             team: 'CHA', bdlId: 3547239,    brid: 'ballla01',  brConf: 'medium' },
  { player: 'Scottie Barnes',          team: 'TOR', bdlId: 17896055,   brid: 'barnesc02', brConf: 'medium' },
  { player: 'Evan Mobley',             team: 'CLE', bdlId: 17896076,   brid: 'mobleev01', brConf: 'medium' },
  { player: 'Jalen Duren',             team: 'DET', bdlId: 38017694,   brid: 'durenja01', brConf: 'medium' },
  { player: 'Michael Porter Jr.',      team: 'DEN', bdlId: 375,        brid: 'portemi02', brConf: 'medium' },
  { player: 'Alperen Sengun',          team: 'HOU', bdlId: 17896062,   brid: 'sengual01', brConf: 'medium' },
  { player: 'Victor Wembanyama',       team: 'SAS', bdlId: 56677822,   brid: 'wembavi01', brConf: 'medium' },
  { player: 'Chet Holmgren',           team: 'OKC', bdlId: 38017685,   brid: 'holmgch01', brConf: 'medium' },
  { player: 'Paolo Banchero',          team: 'ORL', bdlId: 38017683,   brid: 'banchpa01', brConf: 'medium' },
  { player: 'Jalen Johnson',           team: 'ATL', bdlId: 17896157,   brid: 'johnsja05', brConf: 'low' },
  { player: 'Trey Murphy III',         team: 'NOP', bdlId: 18677986,   brid: 'murphtr03', brConf: 'low' },
  { player: 'Brandon Miller',          team: 'CHA', bdlId: 38017688,   brid: 'millbr01',  brConf: 'low' },
  { player: 'Kon Knueppel',            team: 'BKN', bdlId: 1057263194, brid: 'knuepko01', brConf: 'low' },
  { player: 'Sam Merrill',             team: 'CLE', bdlId: 3547299,    brid: 'merrisa01', brConf: 'low' },
];

// ─── BDL lookup ───────────────────────────────────────────────────────────────

// BDL free tier: 30 requests/minute = 2s minimum. Use 2.5s + jitter.
const BDL_DELAY_MS = 2500;

/**
 * Extract last name for BDL search — searching by full name fails on hyphens/apostrophes.
 * "Shai Gilgeous-Alexander" → "Gilgeous-Alexander"
 * "De'Aaron Fox"            → "Fox"
 * "Karl-Anthony Towns"      → "Towns"
 * "Michael Porter Jr."      → "Porter"
 * "Trey Murphy III"         → "Murphy"
 */
function bdlSearchTerm(fullName: string): string {
  const clean = fullName.replace(/\s+(Jr\.|Sr\.|III|II|IV)\.?\s*$/i, '').trim();
  const parts = clean.split(' ');
  return parts.length > 1 ? parts.slice(1).join(' ') : clean;
}

async function lookupBdlId(playerName: string): Promise<number | null> {
  if (!BDL_API_KEY) return null;

  const searchTerm = bdlSearchTerm(playerName);

  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch(
      `${BDL_BASE}/players?search=${encodeURIComponent(searchTerm)}&per_page=10`,
      { headers: { Authorization: BDL_API_KEY } },
    );

    if (res.status === 429) {
      if (attempt === 0) {
        console.warn(`  ⏳ BDL 429 for "${playerName}" — waiting 65s before retry…`);
        await sleep(65_000);
        continue;
      }
      console.warn(`  ⚠️  BDL still 429 after retry for "${playerName}" — skipping`);
      return null;
    }

    if (!res.ok) {
      console.warn(`  ⚠️  BDL search failed for "${playerName}": HTTP ${res.status}`);
      return null;
    }

    const json    = await res.json();
    const results: any[] = json.data ?? [];

    if (results.length === 0) {
      console.warn(`  ⚠️  BDL: no results for "${playerName}" (searched: "${searchTerm}")`);
      return null;
    }

    const nameLower = playerName.toLowerCase().replace(/['.]/g, '');
    const exact = results.find((p: any) => {
      const full = `${p.first_name ?? ''} ${p.last_name ?? ''}`.toLowerCase().replace(/['.]/g, '');
      return full.trim() === nameLower;
    });
    if (exact) return exact.id;

    const [firstName] = playerName.split(' ');
    const partial = results.find((p: any) => {
      const fn = (p.first_name ?? '').toLowerCase();
      const ln = (p.last_name  ?? '').toLowerCase().replace(/['.]/g, '');
      return fn === firstName.toLowerCase() && nameLower.includes(ln);
    });
    if (partial) {
      console.log(`  ℹ️  BDL: "${playerName}" → matched "${partial.first_name} ${partial.last_name}" (id=${partial.id})`);
      return partial.id;
    }

    const first = results[0];
    console.log(`  ⚠️  BDL: "${playerName}" → first result "${first.first_name} ${first.last_name}" (id=${first.id}) — VERIFY`);
    return first.id;
  }

  return null;
}

// ─── BBRef verify ─────────────────────────────────────────────────────────────

async function verifyBrId(player: string, brid: string): Promise<boolean> {
  const letter = brid[0].toLowerCase();
  const url    = `https://www.basketball-reference.com/players/${letter}/${brid}.html`;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'text/html' },
    });
    return res.status === 200;
  } catch {
    return false;
  }
}

// ─── Seed ─────────────────────────────────────────────────────────────────────

async function seed(resolvedEntries: PlayerEntry[]) {
  const now          = new Date().toISOString();
  const nbaIdBatch   = db.batch();
  const brIdBatch    = db.batch();
  const lowBrConf:  string[] = [];
  const missingBdl: string[] = [];

  for (const { player, team, bdlId, brid, brConf } of resolvedEntries) {
    // ── static_nbaIdMap ──────────────────────────────────────────────────────
    // Write BOTH field name sets so the pipeline (player/team/brid) and the
    // Data Hub UI (playerName/teamAbbreviation/bbrId) both work off the same doc.
    const nbaRef = db.collection('static_nbaIdMap').doc(player);
    nbaIdBatch.set(nbaRef, {
      // Pipeline fields
      player,
      team,
      bdlId:  bdlId ?? null,
      brid,
      // Data Hub UI fields (NbaDataHub component reads these)
      playerName:        player,
      teamAbbreviation:  team,
      bbrId:             brid,
      updatedAt: now,
    }, { merge: true });

    // ── static_brIdMap ───────────────────────────────────────────────────────
    const brRef = db.collection('static_brIdMap').doc(player);
    brIdBatch.set(brRef, {
      player,
      brid,
      updatedAt: now,
    }, { merge: true });

    if (brConf === 'low')  lowBrConf.push(`  ⚠️  ${player.padEnd(28)} brid: ${brid}`);
    if (bdlId === null)    missingBdl.push(`  ❓  ${player.padEnd(28)} bdlId: not resolved`);
  }

  await Promise.all([nbaIdBatch.commit(), brIdBatch.commit()]);

  console.log(`\n✅ static_nbaIdMap: ${resolvedEntries.length} players written`);
  console.log(`✅ static_brIdMap:  ${resolvedEntries.length} players written`);

  if (missingBdl.length > 0) {
    console.log(`\n⚠️  ${missingBdl.length} players still missing bdlId — run with --lookup to resolve:`);
    console.log(missingBdl.join('\n'));
  }

  if (lowBrConf.length > 0) {
    console.log(`\n⚠️  ${lowBrConf.length} BR IDs are LOW confidence — verify at:`);
    console.log('   https://www.basketball-reference.com/players/<letter>/<brid>.html');
    console.log(lowBrConf.join('\n'));
  }

  console.log('');
}

// ─── Entry point ─────────────────────────────────────────────────────────────

async function main() {
  const args      = process.argv.slice(2);
  const doLookup  = args.includes('--lookup');
  const doVerify  = args.includes('--verify');

  console.log('\n🏀 NBA ID Seed Script');
  console.log('='.repeat(55));
  console.log(`  Players:  ${PLAYERS.length}`);
  console.log(`  --lookup: ${doLookup} ${doLookup && !BDL_API_KEY ? '(⚠️  BALLDONTLIE_API_KEY not set — will skip)' : ''}`);
  console.log(`  --verify: ${doVerify}`);
  console.log('');

  let entries = [...PLAYERS];

  // ── Phase 1: BBRef verification ───────────────────────────────────────────
  if (doVerify) {
    console.log('🔍 Verifying BBRef IDs…\n');
    let passed = 0, failed = 0;

    for (const entry of entries) {
      const ok   = await verifyBrId(entry.player, entry.brid);
      const icon = ok ? '✅' : '❌';
      console.log(`${icon} ${entry.player.padEnd(28)} ${entry.brid.padEnd(14)} [${ok ? 'HTTP 200' : 'FAILED '}]`);
      ok ? passed++ : failed++;
      await sleep(2500 + Math.random() * 1000); // BBRef rate limit
    }

    console.log(`\n  Passed: ${passed}  Failed: ${failed}`);
    if (failed > 0) {
      console.log('  ❌ Fix failed BR IDs in the PLAYERS array before seeding.');
      if (!args.includes('--force-seed')) {
        console.log('  Run with --force-seed to write anyway, or fix IDs first.\n');
        process.exit(1);
      }
    }
    console.log('');
  }

  // ── Phase 2: BDL ID lookup ────────────────────────────────────────────────
  if (doLookup) {
    if (!BDL_API_KEY) {
      console.log('⚠️  BALLDONTLIE_API_KEY not set — skipping BDL lookup. Set it in .env and re-run.\n');
    } else {
      console.log('🔎 Looking up BDL IDs…\n');
      let resolved = 0, failed = 0;

      for (const entry of entries) {
        if (entry.bdlId !== null) {
          console.log(`  ⏭️  ${entry.player.padEnd(28)} bdlId already set: ${entry.bdlId}`);
          continue;
        }

        const bdlId = await lookupBdlId(entry.player);
        if (bdlId !== null) {
          entry.bdlId = bdlId;
          console.log(`  ✅ ${entry.player.padEnd(28)} bdlId: ${bdlId}`);
          resolved++;
        } else {
          console.log(`  ❌ ${entry.player.padEnd(28)} bdlId: NOT FOUND`);
          failed++;
        }

        await sleep(BDL_DELAY_MS + Math.random() * 500); // free tier: 30 req/min
      }

      console.log(`\n  Resolved: ${resolved}  Failed: ${failed}`);

      if (resolved > 0) {
        console.log('\n📋 Copy these resolved IDs back into the PLAYERS array in this script:');
        console.log('   (So you don\'t need to re-hit the API next time)\n');
        for (const e of entries.filter(e => e.bdlId !== null)) {
          console.log(`  { player: '${e.player}', team: '${e.team}', bdlId: ${e.bdlId}, brid: '${e.brid}', brConf: '${e.brConf}' },`);
        }
      }
      console.log('');
    }
  }

  // ── Phase 3: Write to Firestore ───────────────────────────────────────────
  await seed(entries);
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

main().catch(err => { console.error('❌', err.message ?? err); process.exit(1); });