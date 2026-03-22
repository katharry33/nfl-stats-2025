#!/usr/bin/env tsx
import 'dotenv/config';
import { adminDb } from '@/lib/firebase/admin';
import * as cheerio from 'cheerio';
import { normalizeNBAProp } from '@/lib/enrichment/nba/normalize-nba';
import { getNBAStatFromGame } from '@/lib/enrichment/nba/bball';
import { determineResult, calculateProfitLoss } from '@/lib/enrichment/shared/scoring';

// ─── CLI ARGS ────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const DATE = args.find(a => a.startsWith('--date='))?.split('=')[1] ?? ''; 
const SEASON = args.find(a => a.startsWith('--season='))?.split('=')[1] ?? '2025';
const FORCE = args.includes('--force');

if (!DATE) {
  console.error("❌ Please provide a date: --date=YYYY-MM-DD");
  process.exit(1);
}

/**
 * Scrapes a single player's game log for a specific date
 */
async function getPlayerStatFromBBR(brid: string, season: string, targetDate: string) {
  const url = `https://www.basketball-reference.com/players/${brid[0]}/${brid}/gamelog/${season}`;
  
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const html = await res.text();
    const $ = cheerio.load(html);

    // BBR table rows have IDs like "pgl_basic.123"
    // We search for the row where the date cell matches our target
    let stats: any = null;

    $(`table#pgl_basic tbody tr`).each((_, row) => {
      const dateCell = $(row).find('td[data-stat="date_game"]').text();
      if (dateCell === targetDate) {
        stats = {
          pts:  parseInt($(row).find('td[data-stat="pts"]').text()) || 0,
          ast:  parseInt($(row).find('td[data-stat="ast"]').text()) || 0,
          reb:  parseInt($(row).find('td[data-stat="trb"]').text()) || 0,
          stl:  parseInt($(row).find('td[data-stat="stl"]').text()) || 0,
          blk:  parseInt($(row).find('td[data-stat="blk"]').text()) || 0,
          tov:  parseInt($(row).find('td[data-stat="tov"]').text()) || 0,
          fg3m: parseInt($(row).find('td[data-stat="fg3"]').text()) || 0,
          mp:   $(row).find('td[data-stat="mp"]').text() || "0:00",
        };
      }
    });
    return stats;
  } catch (e) {
    console.error(`Error scraping BBR for ${brid}:`, e);
    return null;
  }
}

async function main() {
  console.log(`\n🏀 BBR Scraper: Grading ${DATE} for Season ${SEASON}`);
  
  // 1. Load Player ID Map
  const mapSnap = await adminDb.collection('static_nbaIdMap').get();
  const idMap: Record<string, string> = {}; // bdlId -> brid
  mapSnap.docs.forEach(d => {
    const data = d.data();
    if (data.bdlId && data.brid) idMap[String(data.bdlId)] = data.brid;
  });

  // 2. Load Props for the Date
  const colName = `nbaProps_${SEASON}`;
  const propsSnap = await adminDb.collection(colName).where('gameDate', '==', DATE).get();
  
  if (propsSnap.empty) {
    console.log("No props found for this date.");
    return;
  }

  console.log(`🔍 Found ${propsSnap.size} props. Checking BBR...`);

  for (const doc of propsSnap.docs) {
    const prop = doc.data();
    if (prop.actualResult && !FORCE) continue;

    const brid = idMap[String(prop.bdlId)];
    if (!brid) {
      console.warn(`⚠️ No BRID found for ${prop.player} (bdlId: ${prop.bdlId})`);
      continue;
    }

    // Add a small delay to avoid BBR rate limits (20 requests per minute)
    await new Promise(r => setTimeout(r, 3100)); 

    const gameStats = await getPlayerStatFromBBR(brid, SEASON, DATE);

    if (!gameStats) {
      console.log(`❌ No stats found on BBR for ${prop.player} on ${DATE}`);
      continue;
    }

    const propNorm = normalizeNBAProp(prop.prop || '');
    const actualStat = getNBAStatFromGame(gameStats, propNorm);

    if (actualStat !== null) {
      const result = determineResult(actualStat, prop.line, prop.overUnder);
      
      const update = {
        gameStat: actualStat,
        actualResult: result.toLowerCase(),
        gradedAt: new Date().toISOString(),
        // Keep detailed stats for tooltips
        rawStats: gameStats 
      };

      await doc.ref.update(update);
      console.log(`✅ Graded ${prop.player}: ${actualStat} ${prop.prop} -> ${result.toUpperCase()}`);
    }
  }

  console.log("\n🏁 Done.");
}

main();