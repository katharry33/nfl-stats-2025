const admin = require('firebase-admin');
const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.applicationDefault() });
}
const db = admin.firestore();

const SPORT = process.argv[2]?.toUpperCase() || 'NFL';
const BDL_API_KEY = process.env.BDL_API_KEY;
const SLEEP_MS = 3500; // Faster than 12s, but safe for 30rpm

const CONFIG = {
  NFL: {
    collection: 'static_pfrIdMap',
    apiEndpoint: 'https://api.balldontlie.io/nfl/v1/players',
    nameField: 'player', 
    idField: 'pfrid'
  },
  NBA: {
    collection: 'static_nbaIdMap',
    // FIX: Using the explicit NBA endpoint to block NFL players
    apiEndpoint: 'https://api.balldontlie.io/nba/v1/players', 
    nameField: 'playerName', 
    idField: 'bdlId'
  }
};

async function sync() {
  const settings = CONFIG[SPORT];
  if (!settings) return console.error("Invalid Sport. Use NFL or NBA.");
  if (!BDL_API_KEY) return console.error("Missing BDL_API_KEY in .env");

  console.log(`🚀 Starting ${SPORT} Sync...`);
  
  try {
    const snapshot = await db.collection(settings.collection).get();
    console.log(`📋 Processing ${snapshot.size} records in ${settings.collection}`);

    for (const doc of snapshot.docs) {
      const data = doc.data();
      const rawName = data[settings.nameField] || data.player || data.name || doc.id.replace(/_/g, ' ');
      
      // Skip if ID already exists
      if ((SPORT === 'NFL' && data.pfrid) || (SPORT === 'NBA' && data.bdlId)) {
        console.log(`⏭️ Skipping ${rawName}`);
        continue;
      }

      try {
        const response = await axios.get(settings.apiEndpoint, {
          params: { search: rawName.replace(/\./g, '') },
          headers: { Authorization: BDL_API_KEY.trim() }
        });

        const results = response.data.data;

        if (results && results.length > 0) {
          let match = results[0];
          
          // Better matching logic for duplicate names
          if (results.length > 1 && data.team) {
            const teamMatch = results.find(p => p.team?.abbreviation?.toUpperCase() === data.team.toUpperCase());
            if (teamMatch) match = teamMatch;
          }

          const updatePayload = {
            [settings.idField]: match.id.toString(),
            [settings.nameField]: rawName,
            name: rawName, // Ensure 'name' field exists for the Hub
            bdl_meta: {
              firstName: match.first_name,
              lastName: match.last_name,
              team: match.team?.abbreviation || 'N/A',
              position: match.position
            },
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          };

          await doc.ref.update(updatePayload);
          console.log(`✅ Linked ${SPORT}: ${rawName} -> ${match.id}`);
        } else {
          console.warn(`⚠️ No match: ${rawName}`);
        }

      } catch (err) {
        if (err.response?.status === 429) {
          console.error("🛑 Rate Limit! Sleeping 60s...");
          await new Promise(r => setTimeout(r, 60000));
        }
        console.error(`❌ Error ${rawName}:`, err.message);
      }
      await new Promise(r => setTimeout(r, SLEEP_MS));
    }
  } catch (err) {
    console.error("💀 Fatal:", err.message);
  }
}

sync();