import { getAdminDb } from '@/lib/firebase/admin';

export async function normalizeBettingLog() {
  const db = getAdminDb();
  const bettingLogRef = db.collection('bettingLog');
  
  // 1. Fetch all documents from the legacy collection
  const snapshot = await bettingLogRef.get();
  console.log(`Found ${snapshot.size} documents to check...`);

  const batch = db.batch();
  let count = 0;

  snapshot.forEach((doc) => {
    const data = doc.data();
    const updates: any = {};

    // A. Fix User ID Mapping
    // If the record has 'uid' but not 'userId', map it so your queries work
    if (data.uid && !data.userId) {
      updates.userId = data.uid;
    }

    // B. Fix Schema (Legs Array)
    // If it's a legacy flat record, wrap it into the new legs format
    if (!data.legs || !Array.isArray(data.legs)) {
      updates.legs = [{
        player: data.player || 'Straight Bet',
        prop: data.prop || '',
        selection: data.selection || '',
        line: data.line || '',
        odds: Number(data.odds || 0),
        matchup: data.matchup || '',
        team: data.team || '',
        status: data.status || data.result || 'pending'
      }];
      
      // Clean up the top-level redundant fields if you want a clean schema
      // updates.player = admin.firestore.FieldValue.delete();
    }

    // C. Fix Timestamp consistency
    // If it has gameDate (string) but no createdAt (Timestamp)
    if (data.gameDate && !data.createdAt) {
      updates.createdAt = new Date(data.gameDate);
    }

    if (Object.keys(updates).length > 0) {
      batch.update(doc.ref, updates);
      count++;
    }

    // Firestore batch limit is 500
    if (count >= 450) {
      console.log('Batch limit approaching, consider splitting if data is huge');
    }
  });

  if (count > 0) {
    await batch.commit();
    console.log(`Successfully normalized ${count} records.`);
  } else {
    console.log('No records required normalization.');
  }
}