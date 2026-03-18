import { adminDb } from '../src/lib/firebase/admin';

// 1. Every Non-Sunday Game (TNF, MNF, Saturdays, Holidays)
const EXCEPTIONS: Record<string, string> = {
  "1-BAL@KC": "2024-09-05", "1-GB@PHI": "2024-09-06", "1-NYJ@SF": "2024-09-09",
  "2-BUF@MIA": "2024-09-12", "2-ATL@PHI": "2024-09-16",
  "3-NE@NYJ": "2024-09-19", "3-JAX@BUF": "2024-09-23", "3-WAS@CIN": "2024-09-23",
  "4-DAL@NYG": "2024-09-26", "4-TEN@MIA": "2024-09-30", "4-SEA@DET": "2024-09-30",
  "5-TB@ATL": "2024-10-03", "5-NO@KC": "2024-10-07",
  "6-SF@SEA": "2024-10-10", "6-BUF@NYJ": "2024-10-14",
  "7-DEN@NO": "2024-10-17", "7-BAL@TB": "2024-10-21", "7-LAC@ARI": "2024-10-21",
  "8-MIN@LAR": "2024-10-24", "8-NYG@PIT": "2024-10-28",
  "9-HOU@NYJ": "2024-10-31", "9-TB@KC": "2024-11-04",
  "10-CIN@BAL": "2024-11-07", "10-MIA@LAR": "2024-11-11",
  "11-WAS@PHI": "2024-11-14", "11-HOU@DAL": "2024-11-18",
  "12-PIT@CLE": "2024-11-21", "12-BAL@LAC": "2024-11-25",
  "13-CHI@DET": "2024-11-28", "13-NYG@DAL": "2024-11-28", "13-MIA@GB": "2024-11-28",
  "13-LV@KC": "2024-11-29", "13-CLE@DEN": "2024-12-02",
  "14-GB@DET": "2024-12-05", "14-CIN@DAL": "2024-12-09",
  "15-LAR@SF": "2024-12-12", "15-CHI@MIN": "2024-12-16", "15-ATL@LV": "2024-12-16",
  "16-CLE@CIN": "2024-12-19", "16-HOU@KC": "2024-12-21", "16-PIT@BAL": "2024-12-21", "16-NO@GB": "2024-12-23",
  "17-KC@PIT": "2024-12-25", "17-BAL@HOU": "2024-12-25", "17-SEA@CHI": "2024-12-26", "17-DET@SF": "2024-12-30"
};

// 2. Standard Sunday Dates
const SUNDAY_MAP: Record<number, string> = {
  1: "2024-09-08", 2: "2024-09-15", 3: "2024-09-22", 4: "2024-09-29",
  5: "2024-10-06", 6: "2024-10-13", 7: "2024-10-20", 8: "2024-10-27",
  9: "2024-11-03", 10: "2024-11-10", 11: "2024-11-17", 12: "2024-11-24",
  13: "2024-12-01", 14: "2024-12-08", 15: "2024-12-15", 16: "2024-12-22",
  17: "2024-12-29", 18: "2025-01-05"
};

async function runPatch() {
  console.log("🔍 Scanning allProps for date issues...");
  const snap = await adminDb.collection('allProps').get();
  let count = 0;

  for (const doc of snap.docs) {
    const data = doc.data();
    
    // Condition: Missing, empty, or corrupted 1899 date
    const isBadDate = !data.gameDate || data.gameDate === "1899-12-30" || data.gameDate === "";

    if (isBadDate) {
      const week = Number(data.week || data.Week);
      let rawMatchup = data.matchup || "";

      // 3. Normalization: "PHI v KC" or "PHI @ KC" -> "PHI@KC"
      let cleanMatchup = rawMatchup
        .toUpperCase()
        .replace(/\s+/g, '')     // Remove all spaces
        .replace(/V/g, '@')      // Replace 'V' with '@'
        .replace(/AT/g, '@');    // Replace 'AT' with '@'

      if (!week || !cleanMatchup) continue;

      // 4. Determine Date
      const date = EXCEPTIONS[`${week}-${cleanMatchup}`] || SUNDAY_MAP[week];

      if (date) {
        await doc.ref.update({ 
          gameDate: date,
          matchup: cleanMatchup, // Save the cleaned version too
          lastPatched: new Date().toISOString()
        });
        count++;
        console.log(`✅ Updated Doc ${doc.id}: Week ${week} ${cleanMatchup} -> ${date}`);
      }
    }
  }

  console.log(`\n🎉 Task Complete. Patched ${count} documents.`);
}

runPatch().catch(console.error);