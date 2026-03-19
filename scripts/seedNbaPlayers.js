const admin = require('firebase-admin');
const axios = require('axios');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault()
  });
}
const db = admin.firestore();

const BDL_API_KEY = process.env.BDL_API_KEY;
const COLLECTION_NAME = 'static_nbaIdMap';

async function seedNbaPlayers() {
  console.log('🏀 Resuming NBA Player Seeding...');
  
  // UPDATE THIS to 500 to pick up where it failed
  let cursor = 500; 
  let hasNextPage = true;

  try {
    while (hasNextPage) {
      console.log(`Fetching batch starting at cursor: ${cursor}...`);
      
      try {
        const response = await axios.get('https://api.balldontlie.io/v1/players', {
          params: { cursor: cursor, per_page: 100 },
          headers: { Authorization: BDL_API_KEY }
        });

        const players = response.data.data;
        const meta = response.data.meta;

        if (!players || players.length === 0) {
          hasNextPage = false;
          break;
        }

        const batch = db.batch();
        players.forEach(player => {
          const docId = `${player.first_name}_${player.last_name}`.toLowerCase().replace(/[^a-z0-9_]/g, '');
          const docRef = db.collection(COLLECTION_NAME).doc(docId);

          batch.set(docRef, {
            name: `${player.first_name} ${player.last_name}`,
            bdlId: player.id,
            team: player.team ? player.team.abbreviation : 'N/A',
            position: player.position || 'N/A',
            league: 'NBA',
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          }, { merge: true });
        });

        await batch.commit();
        console.log(`✅ Processed ${players.length} players (Up to ID: ${players[players.length-1].id}).`);

        if (meta.next_cursor) {
          cursor = meta.next_cursor;
          // Wait 15 seconds between batches to stay under the 429 limit
          console.log('⏳ Waiting 15s for rate limit safety...');
          await new Promise(r => setTimeout(r, 15000));
        } else {
          hasNextPage = false;
        }

      } catch (innerErr) {
        if (innerErr.response && innerErr.response.status === 429) {
          console.warn('🛑 Rate limit hit! Cooling down for 60 seconds...');
          await new Promise(r => setTimeout(r, 60000));
          // Don't increment cursor, just loop again
        } else {
          throw innerErr;
        }
      }
    }

    console.log('🏁 NBA Seeding Complete!');
  } catch (err) {
    console.error('❌ Seeding Failed:', err.message);
  }
}

seedNbaPlayers();