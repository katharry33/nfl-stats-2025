import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import axios from 'axios';

if (!getApps().length) {
  const serviceAccount = JSON.parse(fs.readFileSync('./serviceAccountKey.json', 'utf8'));
  initializeApp({ credential: cert(serviceAccount) });
}
const db = getFirestore();

const ODDS_API_KEY = '0a8e1d9e60c60c533a0dcc26af7efa02'; 
const DAILY_COL = `nbaPropsDaily_2025`;

// All the markets you requested
const MARKETS = [
  'player_points', 'player_rebounds', 'player_assists', 'player_threes',
  'player_blocks', 'player_steals', 'player_blocks_steals', 'player_turnovers',
  'player_points_rebounds_assists', 'player_points_rebounds', 'player_points_assists',
  'player_rebounds_assists', 'player_double_double', 'player_triple_double'
].join(',');

async function masterSync() {
  const TODAY = new Date().toISOString().split('T')[0];
  console.log(`🚀 NBA Master Sync: ${TODAY}`);

  try {
    // 1. Get Event IDs (Costs 1 Request)
    const eventsRes = await axios.get(`https://api.the-odds-api.com/v4/sports/basketball_nba/events`, {
      params: { apiKey: ODDS_API_KEY }
    });

    // Filter for games happening today only to save requests
    const todayEvents = eventsRes.data.filter(e => e.commence_time.includes(TODAY));
    console.log(`🏀 Found ${todayEvents.length} games today.`);

    for (const event of todayEvents) {
      console.log(`📡 Fetching All Props for: ${event.home_team} vs ${event.away_team}`);

      // 2. Fetch ALL Markets for this game (Costs 1 Request per game)
      const propRes = await axios.get(`https://api.the-odds-api.com/v4/sports/basketball_nba/events/${event.id}/odds`, {
        params: {
          apiKey: ODDS_API_KEY,
          regions: 'us',
          markets: MARKETS,
          oddsFormat: 'american'
        }
      });

      const batch = db.batch();
      const bookmakers = propRes.data.bookmakers;

      // We typically take the first bookie (e.g., FanDuel or DraftKings) to keep the DB clean
      if (bookmakers.length > 0) {
        const book = bookmakers[0]; 
        
        book.markets.forEach(market => {
          market.outcomes.forEach(outcome => {
            // Clean up the player name and market key
            const playerName = outcome.description;
            const propType = market.key.replace('player_', '').replace(/_/g, ' ');
            const docId = `nba-${playerName}-${market.key}-${outcome.name}-${TODAY}`.replace(/\s+/g, '_');

            batch.set(db.collection(DAILY_COL).doc(docId), {
              player: playerName,
              prop: propType, // e.g., "points rebounds assists"
              line: outcome.point || null,
              type: outcome.name, // "Over" or "Under" or "Yes"
              price: outcome.price,
              matchup: `${event.away_team} @ ${event.home_team}`,
              gameId: event.id,
              lastUpdated: new Date().toISOString()
            }, { merge: true });
          });
        });
        await batch.commit();
        console.log(`   ✅ Synced ${book.markets.length} different prop types.`);
      }
      
      // Small delay just to be safe
      await new Promise(r => setTimeout(r, 2000));
    }
  } catch (err) {
    console.error("❌ Sync Error:", err.response?.data || err.message);
  }
}

masterSync();