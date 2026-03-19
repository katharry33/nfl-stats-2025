const admin = require('firebase-admin');
const axios = require('axios');

/**
 * NFL ID SYNCER (Final)
 * RUN: BDL_API_KEY="your_key" GOOGLE_APPLICATION_CREDENTIALS="./serviceAccountKey.json" node scripts/syncBdlIds.js
 */

// 1. Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault()
  });
}
const db = admin.firestore();

const BDL_API_KEY = process.env.BDL_API_KEY;
const SLEEP_MS = 12000; // ~5 requests per minute for BDL Free Tier
const COLLECTION_NAME = 'static_pfrIdMap';

async function syncBdlIds() {
  console.log('🚀 Starting Robust BDL ID Sync...');

  if (!BDL_API_KEY) {
    console.error('❌ Error: BDL_API_KEY environment variable is missing.');
    return;
  }

  // --- PART A: CLEANUP ---
  const badDocs = await db.collection(COLLECTION_NAME).where('bdlId', '==', 1).get();
  if (badDocs.size > 0) {
    console.log(`🧹 Cleaning up ${badDocs.size} documents with invalid ID: 1...`);
    const batch = db.batch();
    badDocs.forEach(d => batch.update(d.ref, { bdlId: admin.firestore.FieldValue.delete() }));
    await batch.commit();
    console.log('✨ Cleanup complete.');
  }

  // --- PART B: SYNC ---
  const pfrSnapshot = await db.collection(COLLECTION_NAME).get();
  console.log(`📋 Processing ${pfrSnapshot.size} total players...`);

  for (const doc of pfrSnapshot.docs) {
    const data = doc.data();
    const rawName = data.player || data.name || doc.id;

    // Skip if already mapped with a valid ID
    if (data.bdlId && data.bdlId > 1) {
      console.log(`⏭️ Skipping ${rawName} (Already synced)`);
      continue;
    }

    try {
      // 1. Split name and normalize initials (A.J. -> AJ)
      const nameParts = rawName.trim().split(' ');
      const firstName = nameParts[0].replace(/\./g, ''); 
      const lastName = nameParts.slice(1).join(' ');

      // 2. Try explicit First/Last Name search first (most accurate)
      let response = await axios.get('https://api.balldontlie.io/nfl/v1/players', {
        params: { first_name: firstName, last_name: lastName },
        headers: { Authorization: BDL_API_KEY }
      });

      let bdlResults = response.data.data;

      // 3. Fallback: If no match, try a generic search for the full name
      if (!bdlResults || bdlResults.length === 0) {
        const searchName = rawName.replace(/\./g, '');
        response = await axios.get('https://api.balldontlie.io/nfl/v1/players', {
          params: { search: searchName },
          headers: { Authorization: BDL_API_KEY }
        });
        bdlResults = response.data.data;
      }

      if (bdlResults && bdlResults.length > 0) {
        // Find the best match or take the first result
        const match = bdlResults.find(p => 
          p.last_name.toLowerCase() === lastName.toLowerCase()
        ) || bdlResults[0];

        await doc.ref.update({
          bdlId: match.id,
          bdl_meta: {
            bdlFullName: `${match.first_name} ${match.last_name}`,
            team: match.team ? match.team.abbreviation : 'N/A',
            position: match.position
          },
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        console.log(`✅ Linked: ${rawName} -> ${match.first_name} ${match.last_name} (ID: ${match.id})`);
      } else {
        console.warn(`⚠️ No BDL match found for: ${rawName}`);
      }

    } catch (e) {
      if (e.response && e.response.status === 429) {
        console.error('🛑 Rate limited. Sleeping before next attempt...');
        await new Promise(r => setTimeout(r, SLEEP_MS * 2)); // Double sleep on 429
      } else {
        console.error(`❌ Error syncing ${rawName}:`, e.message);
      }
    }

    // Delay to stay within Free Tier limits (5 requests per minute)
    await new Promise(resolve => setTimeout(resolve, SLEEP_MS));
  }
  
  console.log('🏁 NFL Sync complete.');
}

syncBdlIds();