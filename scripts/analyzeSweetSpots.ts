// scripts/analyzeSweetSpots.ts
import { db } from '@/lib/firebase/admin'; // Adjust based on your admin setup
import type { NFLProp } from '@/lib/types';

async function analyze() {
  console.log("📊 Analyzing historical props for Sweet Spot patterns...");
  
  const snapshot = await db.collectionGroup('allProps_2025').get();
  const data: NFLProp[] = snapshot.docs.map(d => d.data() as NFLProp);

  const patterns = {
    highEV: { total: 0, wins: 0 }, // EV > 10%
    eliteMatchup: { total: 0, wins: 0 }, // OppRank > 25
    perfectStorm: { total: 0, wins: 0 } // EV > 8% AND OppRank > 20
  };

  data.forEach((prop: NFLProp) => {
    const isWin = prop.actualResult === 'won';
    
    if (prop.expectedValue && prop.expectedValue > 0.10) {
      patterns.highEV.total++;
      if (isWin) patterns.highEV.wins++;
    }

    if (prop.opponentRank && prop.opponentRank > 25) {
      patterns.eliteMatchup.total++;
      if (isWin) patterns.eliteMatchup.wins++;
    }

    if (prop.expectedValue && prop.expectedValue > 0.08 && prop.opponentRank && prop.opponentRank > 20) {
      patterns.perfectStorm.total++;
      if (isWin) patterns.perfectStorm.wins++;
    }
  });

  console.table({
    "High EV (>10%)": patterns.highEV.total > 0 ? `${((patterns.highEV.wins / patterns.highEV.total) * 100).toFixed(1)}% WR (${patterns.highEV.wins}/${patterns.highEV.total})` : 'N/A',
    "Elite Matchup": patterns.eliteMatchup.total > 0 ? `${((patterns.eliteMatchup.wins / patterns.eliteMatchup.total) * 100).toFixed(1)}% WR (${patterns.eliteMatchup.wins}/${patterns.eliteMatchup.total})` : 'N/A',
    "The Perfect Storm": patterns.perfectStorm.total > 0 ? `${((patterns.perfectStorm.wins / patterns.perfectStorm.total) * 100).toFixed(1)}% WR (${patterns.perfectStorm.wins}/${patterns.perfectStorm.total})` : 'N/A',
  });
}

analyze();
