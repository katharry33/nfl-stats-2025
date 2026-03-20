import 'dotenv/config';
import { db } from '@/lib/firebase/admin';
import { enrichSingleProp } from '@/lib/enrichment/shared/engine';
import { getPropsForWeek, updateProps } from '@/lib/firestore/props';

interface BatchOptions {
  season: number;
  week:   number;
  sport:  'nfl' | 'nba';
  limit?: number;
}

/**
 * batchEnrichProps
 * Processes an entire week's worth of data through the enrichment engine.
 */
export async function batchEnrichProps({ season, week, sport, limit = 50 }: BatchOptions) {
  console.log(`🚀 Starting Batch Enrichment: ${sport.toUpperCase()} | Season ${season} | Week ${week}`);
  
  // 1. Fetch props from your collection (e.g., nfl_props_2025)
  const props = await getPropsForWeek(season, week, sport) as any[];
    const targetProps = props.slice(0, limit); // Safety limit for testing
  
  console.log(`📋 Found ${props.length} props. Processing first ${targetProps.length}...`);

  const updates: any[] = [];
  const balance = 1000; // Replace with actual user balance if available

  // 2. Loop with a slight delay to respect Balldontlie Rate Limits
  for (const prop of targetProps) {
    try {
      console.log(`  🔍 Enriching: ${prop.player} (${prop.propNorm})`);
      
      const enriched = await enrichSingleProp(prop, balance, sport);
      
      updates.push({
        id: prop.id,
        data: enriched
      });

      // Pause for 1 second every 2 requests to stay under free tier (30req/min)
      if (updates.length % 2 === 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error(`  ❌ Failed to enrich ${prop.player}:`, error);
    }
  }

  // 3. Batch Update Firestore
  if (updates.length > 0) {
    console.log(`💾 Saving ${updates.length} updates to Firestore...`);
    await updateProps(updates, sport, season);
    console.log(`✅ Batch Enrichment Complete!`);
  }
}

// Example Execution: npx tsx scripts/batchEnrich.ts
batchEnrichProps({ season: 2025, week: 10, sport: 'nfl' });