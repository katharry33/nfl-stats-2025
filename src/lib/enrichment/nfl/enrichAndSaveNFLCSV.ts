
import { adminDb } from '@/lib/firebase/admin';
import { PropData } from '@/lib/types';
import Papa from 'papaparse';
import { formatInTimeZone } from 'date-fns-tz';

export async function enrichAndSaveNFLCSV(
  csvString: string | null,
  season: number,
  date?: string,
  rows?: any[],
  week?: number
) {
  let dataToProcess: any[] = [];

  if (rows && rows.length > 0) {
    dataToProcess = rows;
  } else if (csvString) {
    const parsed = Papa.parse(csvString, { header: true, skipEmptyLines: true });
    if (parsed.errors.length) {
      console.warn('CSV parsing errors encountered:', parsed.errors);
    }
    dataToProcess = parsed.data;
  } else {
    return { processed: 0, success: false, errors: ['No data provided.'] };
  }

  if (dataToProcess.length === 0) {
    return { processed: 0, success: true, errors: [] }; // Nothing to do
  }

  // Robustly determine the date in YYYY-MM-DD format for the New York timezone
  const gameDate = date 
    ? date // Trusting the passed date is in the correct YYYY-MM-DD format
    : formatInTimeZone(new Date(), 'America/New_York', 'yyyy-MM-dd');

  const collectionName = `nflProps_${season}`;
  const promises = [];
  let processedCount = 0;
  const errors: string[] = [];

  for (const row of dataToProcess) {
    try {
      const player = row.Player || row.player;
      const prop = row.Prop || row.prop;
      const line = parseFloat(row.Line || row.line);
      const currentWeek = week ?? parseInt(row.Week || row.week, 10);

      if (!player || !prop || isNaN(line) || isNaN(currentWeek)) {
        errors.push(`Skipping invalid row: ${JSON.stringify(row)}`);
        continue;
      }

      // This object structure should align with your PropData type as much as possible.
      const propData: Partial<PropData> & { enriched: boolean; updatedAt: string } = {
        player,
        team: row.Team || row.team,
        prop,
        line,
        odds: parseInt(row.Odds || row.odds, 10) || -110,
        matchup: row.Matchup || row.matchup,
        gameDate: gameDate, // Use the standardized gameDate for all rows in this batch
        league: 'nfl',
        season: season,
        week: currentWeek,
        status: 'pending',
        enriched: false,
        updatedAt: new Date().toISOString(),
      };

      const docId = `${player}_${prop}_${season}_w${currentWeek}`.replace(/[^a-zA-Z0-9_]/g, '_');
      const docRef = adminDb.collection(collectionName).doc(docId);
      
      promises.push(docRef.set(propData, { merge: true }));
      processedCount++;

    } catch (e: any) {
      errors.push(`Error processing row: ${JSON.stringify(row)} - ${e.message}`);
    }
  }

  await Promise.all(promises);

  return { processed: processedCount, success: errors.length === 0, errors };
}
