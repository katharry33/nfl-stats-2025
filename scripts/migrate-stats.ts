import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

if (!getApps().length) {
  const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!keyPath) throw new Error('Set GOOGLE_APPLICATION_CREDENTIALS');
  initializeApp({ credential: cert(keyPath) });
}

const db = getFirestore();

async function migrateBettingLog() {
  console.log('🚀 Starting Betting Log Migration...');
  const snap = await db.collection('bettingLog').get();
  
  const batch = db.batch();
  let count = 0;

  snap.docs.forEach(doc => {
    const data = doc.data();
    const updates: any = {};

    // 1. Ensure numbers are stored as numbers (not strings)
    if (typeof data.stake === 'string') updates.stake = Number(data.stake);
    if (typeof data.odds === 'string') updates.odds = Number(data.odds);

    // 2. Normalize Legs
    if (data.legs && Array.isArray(data.legs)) {
      const updatedLegs = data.legs.map((leg: any) => {
        // If the leg has a status, ensure it's 'won' or 'lost'
        // If the leg is missing a status but the main bet is 'won', the leg won.
        const betStatus = (data.status || '').toLowerCase();
        const legStatus = (leg.status || leg.actualResult || '').toLowerCase();
        
        return {
          ...leg,
          // Fallback to the bet's overall status if the leg status is missing
          status: legStatus || (betStatus === 'won' ? 'won' : betStatus === 'lost' ? 'lost' : 'pending')
        };
      });
      updates.legs = updatedLegs;
    }

    if (Object.keys(updates).length > 0) {
      batch.update(doc.ref, updates);
      count++;
    }
  });

  if (count > 0) {
    await batch.commit();
    console.log(`✅ Successfully updated ${count} bets.`);
  } else {
    console.log('px No updates needed.');
  }
}

migrateBettingLog().catch(console.error);