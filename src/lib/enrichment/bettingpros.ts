// lib/enrichment/bettingpros.ts
import { chromium } from 'playwright';

export async function fetchBettingProsProps() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // URL for the NFL Prop Bet Cheat Sheet
  await page.goto('https://www.bettingpros.com/nfl/picks/prop-bets/', {
    waitUntil: 'networkidle',
  });

  const props = await page.evaluate(() => {
    // BettingPros often uses 'table.pick-table' or '.prop-bets-table'
    const rows = Array.from(document.querySelectorAll('tr.prop-bet-row')); 
    
    return rows.map(row => {
      // These selectors target their current 'Cheat Sheet' layout
      const player = row.querySelector('.player-name-link')?.textContent?.trim() || '';
      const propType = row.querySelector('.prop-type-cell')?.textContent?.trim() || '';
      const recommendation = row.querySelector('.over-under-cell')?.textContent?.trim() || '';
      
      // They usually show stars as a series of <i> tags with a specific class
      const stars = row.querySelectorAll('.star-icon.active').length; 

      return { player, propType, recommendation, rating: stars };
    });
  });

  await browser.close();
  return props;
}