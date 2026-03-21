#!/usr/bin/env tsx
// scripts/debug-bbref2.ts
import { config } from 'dotenv';
config({ path: '.env.local' });

async function main() {
  const url = 'https://www.basketball-reference.com/players/j/jokicni01/gamelog/2025/';
  await new Promise(r => setTimeout(r, 2500));

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'en-US,en;q=0.9',
    },
  });

  const html = await res.text();
  console.log('HTML length:', html.length);

  // Find ALL table IDs
  const tableIds = [...html.matchAll(/<table[^>]*id="([^"]+)"/gi)].map(m => m[1]);
  console.log('\nAll table IDs:', tableIds);

  // Find where data-stat="pts" appears relative to tables
  const ptIdx = html.indexOf('data-stat="pts"');
  console.log('\nFirst data-stat="pts" at position:', ptIdx);

  // Find the nearest <table before that position
  const beforePts = html.slice(0, ptIdx);
  const lastTableOpen = beforePts.lastIndexOf('<table');
  const lastTableId   = html.slice(lastTableOpen, lastTableOpen + 200).match(/id="([^"]+)"/)?.[1] ?? 'no-id';
  console.log('Nearest <table before pts:', lastTableOpen, '  id:', lastTableId);

  // Show 200 chars around first "pts" stat
  console.log('\nContext around first data-stat="pts":');
  console.log(html.slice(ptIdx - 100, ptIdx + 200));

  // Count <tr> rows that contain pts data
  const rows = html.match(/<tr[^>]*>[\s\S]*?data-stat="pts"[\s\S]*?<\/tr>/gi) ?? [];
  console.log('\nRows containing data-stat="pts":', rows.length);
  if (rows.length > 0) {
    console.log('\nFirst such row (first 400 chars):');
    console.log(rows[0].slice(0, 400));
  }

  // Check data-stat="date" context  
  const dateIdx = html.indexOf('data-stat="date"');
  console.log('\nFirst data-stat="date" at position:', dateIdx);
  if (dateIdx > -1) {
    console.log('Context:');
    console.log(html.slice(dateIdx - 50, dateIdx + 150));
  }

  // How many rows have BOTH date and pts?
  const fullRows = html.match(/<tr[^>]*>[\s\S]*?data-stat="date"[\s\S]*?data-stat="pts"[\s\S]*?<\/tr>/gi) ?? [];
  console.log('\nRows with BOTH date + pts:', fullRows.length);

  // Is content inside a JS variable or different structure?
  const hasScript = html.includes('window.__data') || html.includes('window.data');
  console.log('\nData in JS variable:', hasScript);
}

main().catch(err => { console.error('❌', err); process.exit(1); });