#!/usr/bin/env tsx
// scripts/enrich.ts

// 1. Load ENV first
import 'dotenv/config'; 

// 2. Import the already-configured db (this will trigger initialization in your admin.ts)
import { db } from '@/lib/firebase/admin'; 
import { enrichPropsForWeek, enrichAllPropsCollection } from '@/lib/enrichment/enrichProps';

const SEASON = 2025;

async function main() {
  // Ensure db exists before running
  if (!db) throw new Error("Firestore DB not initialized. Check your ENV variables.");

  const weekArg = process.argv.find(a => a.startsWith('--week='))?.split('=')[1] ?? process.env.WEEK;
  const force   = process.argv.includes('--force');
  const useAll  = process.argv.includes('--all');

  // ... (the rest of your logic is perfect as-is)
}

main().catch(err => { console.error('❌', err); process.exit(1); });