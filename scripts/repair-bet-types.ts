// scripts/repair-bet-types.ts
import { adminDb } from '../src/lib/firebase/admin';

async function repairBetTypes() {
  console.log('Searching for bets to repair...');
  const snapshot = await adminDb.collection('bettingLog').get();
  
  const batch = adminDb.batch();
  let repairCount = 0;

  snapshot.docs.forEach(doc => {
    const data = doc.data();
    const legs = data.legs || [];
    
    // Logic: If there's more than 1 leg, it MUST be a Parlay.
    // Also ensuring betType is set for consistency.
    if (legs.length > 1 && data.betType !== 'Parlay') {
      batch.update(doc.ref, { 
        betType: 'Parlay',
        isParlay: true 
      });
      repairCount++;
    } else if (legs.length === 1 && data.betType !== 'Single') {
      batch.update(doc.ref, { 
        betType: 'Single',
        isParlay: false 
      });
      repairCount++;
    }
  });

  if (repairCount > 0) {
    await batch.commit();
    console.log(`✅ Successfully repaired ${repairCount} bets.`);
  } else {
    console.log('✨ No repairs needed. Data is consistent.');
  }
}

repairBetTypes().catch(console.error);