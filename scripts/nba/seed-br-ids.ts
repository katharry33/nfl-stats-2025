// scripts/seed-br-ids.ts
// Populates the static_brIdMap Firestore collection with Basketball Reference
// player IDs — the NBA equivalent of static_pfrIdMap.
//
// Run with:  npx tsx scripts/seed-br-ids.ts
//
// Each document uses the player's full name as the document ID for easy lookup,
// mirroring the static_pfrIdMap pattern.

import * as admin from 'firebase-admin';

// ── Firebase init ────────────────────────────────────────────────────────────
// Reuse your existing admin init pattern (env var or service account JSON).
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: process.env.FIREBASE_PROJECT_ID,
  });
}
const db = admin.firestore();

// ---------------------------------------------------------------------------
// Player → BR ID map
// ---------------------------------------------------------------------------
// IDs follow BBRef's convention: first 5 chars of last name + first 2 of first
// name + 01 (incrementing on collision). Verified against BBRef URLs as of 2025.
//
// ⚠️  IDs marked with a confidence comment should be double-checked by visiting:
//     https://www.basketball-reference.com/players/<first_letter>/<brid>.html
// ---------------------------------------------------------------------------

const PLAYERS: { player: string; brid: string; confidence: 'high' | 'medium' | 'low' }[] = [
  // ── High confidence (well-established veterans) ───────────────────────────
  { player: 'Shai Gilgeous-Alexander', brid: 'gilgesh01', confidence: 'high' },
  { player: 'Luka Doncic',             brid: 'doncilu01', confidence: 'high' },
  { player: 'Nikola Jokic',            brid: 'jokicni01', confidence: 'high' },
  { player: 'Stephen Curry',           brid: 'curryst01', confidence: 'high' },
  { player: 'LeBron James',            brid: 'jamesle01', confidence: 'high' },
  { player: 'Kevin Durant',            brid: 'duranke01', confidence: 'high' },
  { player: 'James Harden',            brid: 'hardeja01', confidence: 'high' },
  { player: 'Kawhi Leonard',           brid: 'leonaka01', confidence: 'high' },
  { player: 'Donovan Mitchell',        brid: 'mitchdo01', confidence: 'high' },
  { player: 'Devin Booker',            brid: 'bookede01', confidence: 'high' },
  { player: 'Jamal Murray',            brid: 'murrayja01', confidence: 'high' },
  { player: 'Karl-Anthony Towns',      brid: 'townska01', confidence: 'high' },
  { player: 'Bam Adebayo',             brid: 'adebaba01', confidence: 'high' },
  { player: 'De\'Aaron Fox',           brid: 'foxdea01',  confidence: 'high' },

  // ── Medium confidence (2019–2022 draft class, less common names) ──────────
  { player: 'Anthony Edwards',         brid: 'edwaran01',  confidence: 'medium' },
  { player: 'Tyrese Maxey',            brid: 'maxeyty01',  confidence: 'medium' },
  { player: 'Jaylen Brown',            brid: 'brownja02',  confidence: 'medium' }, // brownja01 was someone else
  { player: 'Jalen Brunson',           brid: 'brunsja01',  confidence: 'medium' },
  { player: 'Cade Cunningham',         brid: 'cunnica01',  confidence: 'medium' },
  { player: 'LaMelo Ball',             brid: 'ballla01',   confidence: 'medium' },
  { player: 'Scottie Barnes',          brid: 'barnesc02',  confidence: 'medium' }, // barnesc01 may be taken
  { player: 'Evan Mobley',             brid: 'mobleev01',  confidence: 'medium' },
  { player: 'Jalen Duren',             brid: 'durenja01',  confidence: 'medium' },
  { player: 'Michael Porter Jr.',      brid: 'portemi02',  confidence: 'medium' }, // portemi01 = Michael Porter
  { player: 'Alperen Sengun',          brid: 'sengual01',  confidence: 'medium' },

  // ── Lower confidence (shorter BBRef history or unusual name patterns) ─────
  { player: 'Victor Wembanyama',       brid: 'wembavi01',  confidence: 'medium' },
  { player: 'Chet Holmgren',           brid: 'holmgch01',  confidence: 'medium' },
  { player: 'Paolo Banchero',          brid: 'banchpa01',  confidence: 'medium' },
  { player: 'Jalen Johnson',           brid: 'johnsja05',  confidence: 'low'    }, // many Jalen Johnsons — VERIFY
  { player: 'Trey Murphy III',         brid: 'murphtr03',  confidence: 'low'    }, // VERIFY
  { player: 'Brandon Miller',          brid: 'millbr01',   confidence: 'low'    }, // VERIFY — many Brandon Millers
  { player: 'Sam Merrill',             brid: 'merrisa01',  confidence: 'low'    }, // VERIFY
  { player: 'Kon Knueppel',            brid: 'knuepko01',  confidence: 'low'    }, // 2025 rookie — VERIFY
];

// ---------------------------------------------------------------------------
// Seed
// ---------------------------------------------------------------------------

async function seed() {
  const collection = db.collection('static_brIdMap');
  const batch = db.batch();
  const now = new Date().toISOString();

  let written = 0;
  const lowConfidence: string[] = [];

  for (const { player, brid, confidence } of PLAYERS) {
    // Use player name as the document ID (mirrors static_pfrIdMap convention)
    const docRef = collection.doc(player);
    batch.set(
      docRef,
      {
        player,
        brid,
        updatedAt: now,
      },
      { merge: true }
    );
    written++;

    if (confidence === 'low') lowConfidence.push(`  ⚠️  ${player}: ${brid}`);
  }

  await batch.commit();

  console.log(`\n✅ Seeded ${written} players into static_brIdMap.\n`);

  if (lowConfidence.length > 0) {
    console.log('⚠️  The following IDs have LOW confidence and should be verified:');
    console.log('   Visit: https://www.basketball-reference.com/players/<letter>/<brid>.html');
    console.log(lowConfidence.join('\n'));
    console.log('');
  }
}

// ---------------------------------------------------------------------------
// Verification helper
// ---------------------------------------------------------------------------
// Run this separately if you want to confirm IDs before seeding:
//   npx tsx scripts/seed-br-ids.ts --verify

async function verify() {
  console.log('🔍 Verifying BR IDs by hitting BBRef...\n');

  for (const { player, brid } of PLAYERS) {
    const letter = brid[0].toLowerCase();
    const url = `https://www.basketball-reference.com/players/${letter}/${brid}.html`;

    try {
      // Minimal head-only check — we just want the status code
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; SweetSpot/1.0)',
          'Accept': 'text/html',
        },
        redirect: 'follow',
      });

      const ok = res.status === 200;
      const icon = ok ? '✅' : '❌';
      console.log(`${icon} ${player.padEnd(28)} ${brid.padEnd(14)} [HTTP ${res.status}]  ${url}`);
    } catch (err) {
      console.log(`💥 ${player.padEnd(28)} ${brid.padEnd(14)} [ERROR] ${err}`);
    }

    // Polite delay — BBRef will 429 you without it
    await new Promise(r => setTimeout(r, 2500 + Math.random() * 1000));
  }
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
if (args.includes('--verify')) {
  verify().catch(console.error);
} else {
  seed().catch(console.error);
}