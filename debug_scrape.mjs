import { readFileSync } from 'fs';
import { config } from 'dotenv';
config({ path: '.env.local' });

const KEY = process.env.SCRAPER_API_KEY;

const pfrUrl = `https://api.scraperapi.com?api_key=${KEY}&url=${encodeURIComponent('https://www.pro-football-reference.com/years/2024/receiving.htm')}`;
const pfrHtml = await fetch(pfrUrl).then(r => r.text());
const stripped = pfrHtml.replace(/<!--([\s\S]*?)-->/g, (_, i) => i.includes('id="receiving"') ? i : '');
const tbl = stripped.match(/<table[^>]*id="receiving"[^>]*>[\s\S]*?<\/table>/i);
if (tbl) {
  const rows = tbl[0].match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) ?? [];
  const dataRows = rows.filter(r => r.includes('<td'));
  console.log('PFR ROW COUNT:', dataRows.length);
  console.log('PFR FIRST ROW:\n', dataRows[0]?.slice(0, 1000));
} else {
  console.log('PFR TABLE NOT FOUND, HTML size:', pfrHtml.length);
}

const trUrl = `https://api.scraperapi.com?api_key=${KEY}&url=${encodeURIComponent('https://www.teamrankings.com/nfl/stat/opponent-rushing-yards-per-game?date=2025-02-10')}`;
const trHtml = await fetch(trUrl).then(r => r.text());
const tableClass = trHtml.match(/<table[^>]*class="([^"]*)"/)?.[1];
console.log('\nTR TABLE CLASS:', tableClass);
const tableMatch = trHtml.match(/<table[^>]*>([\s\S]*?)<\/table>/i);
console.log('TR FIRST 800 CHARS:\n', tableMatch?.[1]?.slice(0, 800));
