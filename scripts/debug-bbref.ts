#!/usr/bin/env tsx
// scripts/debug-bbref.ts
// Run: npx tsx scripts/debug-bbref.ts

import { config } from 'dotenv';
config({ path: '.env.local' });

async function main() {
  const url = 'https://www.basketball-reference.com/players/j/jokicni01/gamelog/2025/';
  console.log('Fetching:', url);

  await new Promise(r => setTimeout(r, 2500));

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    },
  });

  console.log('HTTP status:', res.status);

  const html = await res.text();
  console.log('HTML length:', html.length, 'chars');

  // Key diagnostics
  console.log('\n── Table detection ──────────────────────────');
  console.log('Has pgl_basic:          ', html.includes('id="pgl_basic"'));
  console.log('Table directly in HTML: ', /<table[^>]*id="pgl_basic"/.test(html));
  console.log('Table inside comment:   ', /<!--[\s\S]{0,5000}id="pgl_basic"[\s\S]{0,5000}-->/.test(html));
  console.log('Has any <table>:        ', html.includes('<table'));
  console.log('Has game_season stat:   ', html.includes('data-stat="game_season"'));
  console.log('Has date_game stat:     ', html.includes('data-stat="date_game"'));

  // Bot/block detection
  console.log('\n── Block detection ──────────────────────────');
  console.log('Cloudflare:             ', html.toLowerCase().includes('cloudflare'));
  console.log('JS required:            ', html.includes('Please enable JavaScript') || html.includes('enable javascript'));
  console.log('Rate limited/blocked:   ', html.includes('429') || html.includes('Too Many Requests'));
  console.log('Redirect to login:      ', html.includes('login') || res.url.includes('login'));

  // Show first 500 chars of body to see what we got
  console.log('\n── First 500 chars of response ──────────────');
  console.log(html.slice(0, 500));

  // If table found, show a snippet
  const idx = html.indexOf('pgl_basic');
  if (idx > -1) {
    console.log('\n── 300 chars around pgl_basic ───────────────');
    console.log(html.slice(Math.max(0, idx - 150), idx + 150));
  }

  // Try to find any data-stat attributes
  const dataStats = html.match(/data-stat="[^"]+"/g) ?? [];
  const unique = [...new Set(dataStats)].slice(0, 20);
  console.log('\n── Sample data-stat values found ────────────');
  console.log(unique.join(', ') || 'NONE FOUND');
}

main().catch(err => { console.error('❌', err.message ?? err); process.exit(1); });