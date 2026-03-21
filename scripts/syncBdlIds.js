/**
 * RUN COMMAND:
 * export GOOGLE_APPLICATION_CREDENTIALS="/path/to/your/service-account.json"
 * node scripts/syncBdlIds.js --force-tag
 */

const admin = require('firebase-admin');
const axios = require('axios');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault()
  });
}

const db = admin.firestore();

// CONFIG - Ensure these match your actual tier limits
const BDL_API_KEY = "4fb66b96-1044-4635-9bcc-55b6b4668e07";
const BASE_URL = "https://api.balldontlie.io/v1/nfl/players";
const SLEEP_MS = 12000; // 5 req/min for Free Tier. Change to 1000 for All-Star.
const COLLECTION_NAME = 'static_pfrIdMap';

// Check for --force-tag flag in command line
const forceTag = process.argv.includes('--force-tag');

async function syncBdlIds() {
  console.log(`🚀 Starting NFL BDL ID Sync ${forceTag ? '(FORCE TAGGING ENABLED)' : ''}...`);
  
  try {
    const pfrSnapshot = await db.collection(COLLECTION_NAME).get();
    console.log(`📋 Processing ${pfrSnapshot.size} records...`);

    for (const doc of pfrSnapshot.docs) {
      const data = doc.data();
      
      // 1. Resolve Name and ensure playerName exists
      const currentName = data.player || data.playerName || doc.id.replace(/_/g, ' ');
      
      // 2. Logic: Should we skip?
      // If they already have an ID and we aren't force-tagging missing playerName fields, skip.
      if (data.bdlId && data.playerName && !forceTag) {
        console.log(`⏭️ Skipping ${currentName} (Fully synced)`);
        continue;
      }

      // 3. Normalize for BDL Search (e.g., A.J. Brown -> AJ Brown)
      const searchName = currentName.replace(/\./g, '').trim();

      try {
        console.log(`🔍 Searching BDL for: ${searchName}...`);
        const response = await axios.get(BASE_URL, {
          params: { search: searchName },
          headers: { Authorization: BDL_API_KEY }
        });

        const bdlResults = response.data.data;
        let updatePayload = {
          playerName: currentName, // Standardizes for your Hub
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        if (bdlResults && bdlResults.length > 0) {
          const match = bdlResults[0]; // Take first match
          updatePayload.bdlId = match.id.toString();
          updatePayload.bdl_meta = {
            firstName: match.first_name,
            lastName: match.last_name,
            position: match.position
          };
          console.log(`✅ Linked: ${currentName} -> BDL ID ${match.id}`);
        } else {
          console.warn(`⚠️ No BDL match for: ${currentName} (Tagging playerName anyway)`);
        }

        // Apply the update
        await doc.ref.update(updatePayload);

      } catch (error) {
        if (error.response?.status === 429) {
          console.error('🛑 Rate limit hit! Sleeping 60s...');
          await new Promise(r => setTimeout(r, 60000));
        } else {
          console.error(`❌ Error with ${currentName}:`, error.message);
        }
      }

      await new Promise(resolve => setTimeout(resolve, SLEEP_MS));
    }

    console.log('🏁 Data Cleanse & Sync complete.');
  } catch (err) {
    console.error('💀 Fatal Error:', err.message);
  }
}

syncBdlIds();