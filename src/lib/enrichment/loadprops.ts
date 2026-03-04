import { adminDb } from '../firebase/admin';
import { NFLProp } from '../types';
import { chromium } from 'playwright';

/**
 * Betting Edge Logic
 */
function getImpliedProbability(odds: number): number {
  if (odds === 0) return 0.5;
  return odds > 0 ? 100 / (odds + 100) : Math.abs(odds) / (Math.abs(odds) + 100);
}

function calculateEdge(projection: number, odds: number): number {
  const implied = getImpliedProbability(odds);
  return projection - implied;
}

export async function runEnrichment() {
  const week = 1; // Or fetch dynamically
  const season = 2024; // Or fetch dynamically

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    // FIX for Error 7034/7005: Explicitly type the array
    const rawScrapedData: NFLProp[] = [];

    // SCRAPER LOGIC GOES HERE
    // Example: await page.goto('...');

    for (const data of rawScrapedData) {
      // Logic for Thursday Enrichment
      const myProjection = data.projWinPct || 0.50;
      const currentOdds = data.Odds || data.odds || -110;
      const edge = calculateEdge(myProjection, currentOdds);

      // Icon Logic based on Edge
      let icon = '';
      if (edge > 0.08) icon = '🔥';
      else if (edge > 0.04) icon = '⚠️';

      const propToSave: NFLProp = {
        player: data.Player || data.player,
        prop: data.Prop || data.prop,
        line: data.Line || data.line,
        team: data.Team || data.team,
        bestOdds: currentOdds,
        bestEdgePct: edge,
        valueIcon: icon,
        confidenceScore: (data.expertStars || 3) * 20,
        updatedAt: new Date().toISOString()
      };

      // Path matches your /api/props route logic
      const path = `seasons/${season}/weeks/${week}/props`;
      await adminDb.collection(path).add(propToSave);
    }

  } catch (error) {
    console.error("Scraper Error:", error);
  } finally {
    await browser.close();
  }
}
