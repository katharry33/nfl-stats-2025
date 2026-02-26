#!/usr/bin/env npx tsx
// scripts/postGame.ts
//
// Reads props from allProps_2025, fetches PFR game logs,
// writes gameStat + actualResult back to each doc.
//
// Usage:
//   cd ~/project && npx tsx scripts/postGame.ts --week=18
//   npx tsx scripts/postGame.ts --week=18 --season=2024   (uses allProps)
//   npx tsx scripts/postGame.ts --week=18 --dry-run

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

// ── Firebase init ────────────────────────────────────────────────────────────
if (!getApps().length) {
  const key = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  initializeApp(key ? { credential: cert(JSON.parse(key)) } : undefined);
}
const db = getFirestore();

// ── CLI args ─────────────────────────────────────────────────────────────────
const args       = process.argv.slice(2);
const isDryRun   = args.includes('--dry-run');
const weekArg    = args.find(a => a.startsWith('--week='))?.split('=')[1];
const seasonArg  = args.find(a => a.startsWith('--season='))?.split('=')[1] ?? '2025';

if (!weekArg) {
  console.error('❌  Usage: npx tsx scripts/postGame.ts --week=18');
  process.exit(1);
}

const WEEK   = parseInt(weekArg, 10);
const SEASON = parseInt(seasonArg, 10);
const COLLECTION = `allProps_${SEASON}`;

// ── PFR fetch helpers ────────────────────────────────────────────────────────

const PFR_CACHE = new Map<string, any[]>();

async function fetchWithRetry(url: string, maxRetries = 3): Promise<Response | null> {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'text/html,application/xhtml+xml',
    'Accept-Language': 'en-US,en;q=0.9',
  };
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch(url, { headers });
      if (res.ok || res.status === 404) return res;
      if (res.status === 429 || res.status >= 500) {
        await sleep(1000 * Math.pow(2, i));
        continue;
      }
      return res;
    } catch (err) {
      if (i === maxRetries - 1) throw err;
      await sleep(1000 * Math.pow(2, i));
    }
  }
  return null;
}

function parsePfrGameLog(html: string): any[] {
  const games: any[] = [];
  const commentMatch = html.match(/<!--([\s\S]*?id="stats"[\s\S]*?)-->/i);
  const tableHtml = commentMatch
    ? commentMatch[1]
    : html.match(/<table[^>]*id="stats"[^>]*>([\s\S]*?)<\/table>/i)?.[1];
  if (!tableHtml) return games;

  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch: RegExpExecArray | null;

  while ((rowMatch = rowRegex.exec(tableHtml)) !== null) {
    const rowHtml = rowMatch[1];
    if (rowHtml.includes('<th') && !rowHtml.includes('<td')) continue;

    const cell = (stat: string): string => {
      const m = rowHtml.match(new RegExp(`<(?:td|th)[^>]*data-stat="${stat}"[^>]*>([\\s\\S]*?)<\\/(?:td|th)>`, 'i'));
      if (!m) return '';
      let val = m[1];
      if (stat === 'game_date') { const csk = m[0].match(/data-csk="([^"]+)"/); if (csk) val = csk[1]; }
      const link = val.match(/<a[^>]*>([^<]+)<\/a>/i);
      if (link) val = link[1];
      return val.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
    };

    const weekNum = parseInt(cell('week_num'), 10);
    if (isNaN(weekNum)) continue;

    games.push({
      week:        weekNum,
      date:        cell('game_date'),
      passYds:     parseFloat(cell('pass_yds'))  || 0,
      passAtt:     parseFloat(cell('pass_att'))  || 0,
      passCmp:     parseFloat(cell('pass_cmp'))  || 0,
      passTds:     parseFloat(cell('pass_td'))   || 0,
      rushYds:     parseFloat(cell('rush_yds'))  || 0,
      rushAtt:     parseFloat(cell('rush_att'))  || 0,
      rushTds:     parseFloat(cell('rush_td'))   || 0,
      receptions:  parseFloat(cell('rec'))       || 0,
      recYds:      parseFloat(cell('rec_yds'))   || 0,
      recTds:      parseFloat(cell('rec_td'))    || 0,
    });
  }
  return games;
}

async function fetchSeasonLog(pfrId: string, season: number): Promise<any[]> {
  const key = `${pfrId}:${season}`;
  if (PFR_CACHE.has(key)) return PFR_CACHE.get(key)!;

  const url = `https://www.pro-football-reference.com/players/${pfrId[0]}/${pfrId}/gamelog/${season}/`;
  const res = await fetchWithRetry(url);
  if (!res || !res.ok) { PFR_CACHE.set(key, []); return []; }

  const html = await res.text();
  const games = parsePfrGameLog(html);
  PFR_CACHE.set(key, games);
  await sleep(400); // polite rate limit
  return games;
}

// ── Stat extraction ───────────────────────────────────────────────────────────

function normalizeProp(raw: string): string {
  return raw.toLowerCase()
    .replace(/yards?/g, 'yds').replace(/receptions?/g, 'recs')
    .replace(/touchdowns?|tds?/g, 'tds').replace(/attempts?/g, 'att')
    .replace(/completions?/g, 'cmp').replace(/passing/g, 'pass')
    .replace(/rushing/g, 'rush').replace(/receiving/g, 'rec')
    .replace(/\s+/g, ' ').trim();
}

function getStatForProp(game: any, propNorm: string): number | null {
  const p = normalizeProp(propNorm);
  if (p.includes('pass') && p.includes('rush'))  return game.passYds + game.rushYds;
  if (p.includes('rush') && p.includes('rec'))   return game.rushYds + game.recYds;
  if (p.includes('pass yds') || p.includes('pass yards'))  return game.passYds;
  if (p.includes('pass att'))                     return game.passAtt;
  if (p.includes('pass cmp'))                     return game.passCmp;
  if (p.includes('pass tds') || p.includes('pass td'))    return game.passTds;
  if (p.includes('rush yds') || p.includes('rush yards')) return game.rushYds;
  if (p.includes('rush att'))                     return game.rushAtt;
  if (p.includes('rush tds') || p.includes('rush td'))    return game.rushTds;
  if (p.includes('rec yds') || p.includes('rec yards'))   return game.recYds;
  if (p.includes('rec') || p.includes('reception'))       return game.receptions;
  if (p.includes('anytime td') || p.includes('td scorer')) {
    return (game.passTds + game.rushTds + game.recTds) > 0 ? 1 : 0;
  }
  return null;
}

function determineResult(stat: number, line: number, overunder: string): 'Win' | 'Loss' | 'Push' {
  const ou = (overunder || '').toLowerCase();
  if (stat === line) return 'Push';
  if (ou.includes('over'))  return stat > line ? 'Win' : 'Loss';
  if (ou.includes('under')) return stat < line ? 'Win' : 'Loss';
  // No explicit over/under stored — just record the stat, skip result
  return 'Push';
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🏈 Post-Game Results: Week ${WEEK}, ${SEASON}`);
  console.log(`   Collection: ${COLLECTION}`);
  console.log(`   Mode: ${isDryRun ? '🔍 DRY RUN' : '✍️  LIVE'}\n`);

  // ── 1. Load PFR ID map from static_pfr_Id_Map ────────────────────────────
  console.log('📥 Loading static_pfr_Id_Map...');
  const pfrMapSnap = await db.collection('static_pfr_Id_Map').get();
  const pfrIdMap: Record<string, string> = {};
  pfrMapSnap.docs.forEach(d => {
    const data = d.data();
    // Handles both { playerName, pfrId } and { player, id } field shapes
    const name = (data.playerName || data.player || data.name || '').toLowerCase().trim();
    const id   = data.pfrId || data.pfr_id || data.id || '';
    if (name && id) pfrIdMap[name] = id;
  });
  console.log(`   ${Object.keys(pfrIdMap).length} players in PFR ID map\n`);

  // ── 2. Load props for this week ──────────────────────────────────────────
  console.log(`📥 Loading ${COLLECTION} week ${WEEK}...`);
  const propsSnap = await db.collection(COLLECTION)
    .where('week', '==', WEEK)
    .get();

  const props = propsSnap.docs.map(d => ({ id: d.id, ...d.data() as any }));
  console.log(`   ${props.length} props to process\n`);

  if (props.length === 0) {
    console.log('⚠️  No props found for this week. Check the week number and collection.');
    return;
  }

  // ── 3. Process each unique player ────────────────────────────────────────
  const updates: Array<{ docId: string; data: Record<string, any> }> = [];
  const skipped: string[] = [];
  const noId: string[]    = [];

  // Group by player to minimize PFR fetches
  const playerSet = new Set(props.map((p: any) => (p.player || '').toLowerCase().trim()));

  const gameCache = new Map<string, any>(); // playerNorm → game for this week

  for (const playerNorm of playerSet) {
    if (!playerNorm) continue;

    // Find PFR ID
    let pfrId = pfrIdMap[playerNorm];

    // Fuzzy fallback: last name match
    if (!pfrId) {
      const lastName = playerNorm.split(' ').pop() ?? '';
      pfrId = Object.entries(pfrIdMap).find(([n]) => n.endsWith(lastName))?.[1] ?? '';
    }

    if (!pfrId) {
      noId.push(playerNorm);
      continue;
    }

    // Fetch game log
    const seasonToUse = WEEK <= 3 ? SEASON - 1 : SEASON;
    const games = await fetchSeasonLog(pfrId, seasonToUse);
    const game  = games.find(g => g.week === WEEK);

    if (!game) {
      skipped.push(`${playerNorm} (no game found for week ${WEEK})`);
      continue;
    }

    gameCache.set(playerNorm, game);
    process.stdout.write(`  ✅ ${playerNorm}\n`);
  }

  console.log(`\n📊 Game data found for ${gameCache.size}/${playerSet.size} players\n`);

  // ── 4. Build updates ──────────────────────────────────────────────────────
  for (const prop of props) {
    const playerNorm = (prop.player || '').toLowerCase().trim();
    const game = gameCache.get(playerNorm);
    if (!game) continue;

    const propNorm = normalizeProp(prop.prop || '');
    const stat = getStatForProp(game, propNorm);
    if (stat === null) continue;

    // overunder field may be stored as 'Over', 'Under', 'over 55.5', 'Over 55.5', etc.
    const ouRaw = prop.overunder || prop.overUnder || prop.selection || prop.over_under || '';
    const result = ouRaw ? determineResult(stat, Number(prop.line || 0), ouRaw) : null;

    updates.push({
      docId: prop.id,
      data: {
        gameStat:     stat,
        actualResult: result,
        updatedAt:    Timestamp.now(),
      },
    });
  }

  // ── 5. Write or preview ───────────────────────────────────────────────────
  const wins   = updates.filter(u => u.data.actualResult === 'Win').length;
  const losses = updates.filter(u => u.data.actualResult === 'Loss').length;
  const pushes = updates.filter(u => u.data.actualResult === 'Push').length;
  const noOu   = updates.filter(u => u.data.actualResult === null).length;

  if (isDryRun) {
    console.log('🔍 DRY RUN — sample updates:');
    updates.slice(0, 5).forEach(u => {
      const prop = props.find((p: any) => p.id === u.docId);
      console.log(`  ${prop?.player} | ${prop?.prop} ${prop?.line} | stat=${u.data.gameStat} | ${u.data.actualResult ?? 'no O/U'}`);
    });
  } else if (updates.length > 0) {
    // Batch write in groups of 400
    const BATCH_SIZE = 400;
    for (let i = 0; i < updates.length; i += BATCH_SIZE) {
      const batch = db.batch();
      updates.slice(i, i + BATCH_SIZE).forEach(u => {
        batch.update(db.collection(COLLECTION).doc(u.docId), u.data);
      });
      await batch.commit();
      process.stdout.write(`\r  ✍️  ${Math.min(i + BATCH_SIZE, updates.length)}/${updates.length} written`);
    }
    console.log('');
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n' + '═'.repeat(50));
  console.log(`✅  Week ${WEEK} post-game complete`);
  console.log(`   Props updated: ${updates.length}`);
  console.log(`   Win: ${wins}  Loss: ${losses}  Push: ${pushes}  No O/U: ${noOu}`);
  if (noId.length)   console.log(`\n⚠️  No PFR ID found for: ${noId.join(', ')}`);
  if (skipped.length) console.log(`⚠️  Skipped: ${skipped.join(', ')}`);
  console.log(`\n💡 Add missing players to static_pfr_Id_Map in Firestore.`);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

main().catch(err => { console.error('❌ Fatal:', err); process.exit(1); });