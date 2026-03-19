const admin = require('firebase-admin');
const axios = require('axios');

/**
 * RUN COMMAND:
 * export GOOGLE_APPLICATION_CREDENTIALS="/path/to/your/service-account.json"
 * export BDL_API_KEY="69d21e57-4a04-47ea-bf29-dd63fe1e2a39"
 * node scripts/syncBdlIds.js
 */

// 1. Direct Firebase Initialization
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault()
  });
}

const db = admin.firestore();

// 2. Configuration
const BDL_API_KEY = "69d21e57-4a04-47ea-bf29-dd63fe1e2a39";
const SLEEP_MS = 12000; // ~5 requests per minute for BDL Free Tier
const COLLECTION_NAME = 'static_pfrIdMap';

async function syncBdlIds() {
  console.log('🚀 Starting BDL ID Sync (JS Mode)...');
  
  if (!BDL_API_KEY) {
    console.error('❌ Missing BDL_API_KEY environment variable.');
    return;
  }

  try {
    const pfrSnapshot = await db.collection(COLLECTION_NAME).get();
    console.log(`📋 Found ${pfrSnapshot.size} players in ${COLLECTION_NAME}.`);

    for (const doc of pfrSnapshot.docs) {
      const data = doc.data();
      
      // Determine name from your schema
      const rawName = data.player || data.name || doc.id.replace(/_/g, ' ');
      
      if (data.bdlId) {
        console.log(`⏭️ Skipping ${rawName} (already has BDL ID: ${data.bdlId})`);
        continue;
      }

      // Normalize name for better searching (A.J. -> AJ)
      const searchName = rawName.replace(/\./g, '');

      try {
        const response = await axios.get('https://api.balldontlie.io/nfl/v1/players', {
          params: { search: searchName },
          headers: { Authorization: BDL_API_KEY }
        });

        const bdlResults = response.data.data;

        if (bdlResults && bdlResults.length > 0) {
          let match = bdlResults[0];
          
          // Logic for multiple results (e.g., matching by team)
          if (bdlResults.length > 1 && data.team) {
            const teamMatch = bdlResults.find(p => 
              p.team && p.team.abbreviation.toUpperCase() === data.team.toUpperCase()
            );
            if (teamMatch) match = teamMatch;
          }

          await doc.ref.update({
            bdlId: match.id,
            bdl_meta: {
              firstName: match.first_name,
              lastName: match.last_name,
              team: match.team ? match.team.abbreviation : 'N/A',
              position: match.position
            },
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
          
          console.log(`✅ Linked: ${rawName} -> BDL ID ${match.id} (${match.team ? match.team.abbreviation : 'N/A'})`);
        } else {
          console.warn(`⚠️ No BDL match found for: ${rawName}`);
        }

      } catch (error) {
        if (error.response && error.response.status === 429) {
          console.error('🛑 Rate limit hit! Wait longer between requests.');
        } else {
          console.error(`❌ Error syncing ${rawName}:`, error.message);
        }
      }

      // Respect BDL rate limits
      await new Promise(resolve => setTimeout(resolve, SLEEP_MS));
    }

    console.log('🏁 Sync complete.');
  } catch (err) {
    console.error('💀 Fatal Script Error:', err.message);
  }
}

syncBdlIds();