// scripts/seedNbaPlayers.js

const dotenv = require('dotenv');
// This covers both .env and .env.local scenarios
dotenv.config(); 
dotenv.config({ path: '.env.local' });
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

  if (!BDL_API_KEY) {
    console.error('❌ FATAL: BDL_API_KEY is missing from .env.');
    return;
  }

  // Set to 500 based on your last failure point
  let cursor = 500; 
  let hasNextPage = true;

  try {
    while (hasNextPage) {
      console.log(`📡 Fetching batch starting at cursor: ${cursor}...`);
      
      try {
        const response = await axios.get('https://api.balldontlie.io/v1/players', {
          params: { cursor: cursor, per_page: 100 },
          headers: { 
            // Standardizing the Authorization Header
            'Authorization': BDL_API_KEY.trim()
          }
        });

        const players = response.data.data;
        const meta = response.data.meta;

        if (!players || players.length === 0) {
          hasNextPage = false;
          break;
        }

        const batch = db.batch();
        
        players.forEach(player => {
          const fullName = `${player.first_name} ${player.last_name}`;

          const playerData = {
            bdlId: player.id,
            name: fullName,           // Primary name field
            playerName: fullName,     // Duplicate for Hub compatibility
            firstName: player.first_name,
            lastName: player.last_name,
            team: player.team?.abbreviation || 'N/A',
            position: player.position,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          };
          
          // Use the ID as the document name to prevent duplicates
          const docRef = db.collection('static_nbaIdMap').doc(player.id.toString());
          batch.set(docRef, playerData);
        });

        await batch.commit();
        console.log(`✅ Processed 100 players. Last ID: ${players[players.length-1].id}`);

        if (meta.next_cursor) {
          cursor = meta.next_cursor;
          console.log(`⏳ Cooling down 10s... Next cursor: ${cursor}`);
          await new Promise(r => setTimeout(r, 10000));
        } else {
          hasNextPage = false;
        }

      } catch (innerErr) {
        if (innerErr.response?.status === 429) {
          console.warn('🛑 Rate limit! Cooling down 60s...');
          await new Promise(r => setTimeout(r, 60000));
        } else if (innerErr.response?.status === 401) {
          console.error('❌ 401 Unauthorized. Verify your API key is correct and your account is active.');
          process.exit(1); 
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