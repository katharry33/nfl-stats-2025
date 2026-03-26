import { parse } from 'csv-parse/sync';
import { adminDb } from '@/lib/firebase/admin';
import { PropData } from '@/lib/types';

const BATCH_SIZE = 500;

interface NBACsvRow {
  player: string;
  prop: string;
  line: string;
  team: string;
  odds: string;
  source: string;
  matchup: string;
  gameDate: string;
}

export async function enrichAndSaveNBACSV(csvString: string, season: number, league: string) {
  const records: NBACsvRow[] = parse(csvString, { 
    columns: true, 
    skip_empty_lines: true 
  });

  const collectionName = `${league}Props_${season}`;
  const collectionRef = adminDb.collection(collectionName);
  let batch = adminDb.batch();
  let batchCount = 0;

  // Using a for...of loop here to allow for asynchronous operations (await) inside the loop.
  // A forEach loop would not wait for the batch commits to finish.
  for (const row of records) {
    const propId = `${row.player}-${row.prop}-${row.line}`.toLowerCase().replace(/\s/g, '-');
    const propData: PropData = {
      id: propId,
      player: row.player,
      team: row.team,
      league: 'nba',
      season: season,
      prop: row.prop,
      line: parseFloat(row.line),
      odds: parseInt(row.odds, 10),
      source: row.source,
      matchup: row.matchup,
      gameDate: row.gameDate,
      enriched: true,
      status: 'unresolved',
    };

    const docRef = collectionRef.doc(propId);
    batch.set(docRef, propData, { merge: true });
    batchCount++;

    if (batchCount >= BATCH_SIZE) {
      await batch.commit();
      batch = adminDb.batch();
      batchCount = 0;
    }
  }

  if (batchCount > 0) {
    await batch.commit();
  }

  return { success: true, count: records.length };
}
