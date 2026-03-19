import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

// 1. Initialize Firebase Admin
const serviceAccount = JSON.parse(fs.readFileSync('./serviceAccountKey.json', 'utf8'));

// Check if already initialized to prevent errors in some environments
if (process.env.NODE_ENV !== 'production') {
    initializeApp({ credential: cert(serviceAccount) });
}

const db = getFirestore();

const nbaTeams = [
  { id: 1, name: "Hawks", city: "Atlanta", abbrev: "ATL", conference: "East" },
  { id: 2, name: "Celtics", city: "Boston", abbrev: "BOS", conference: "East" },
  { id: 3, name: "Nets", city: "Brooklyn", abbrev: "BKN", conference: "East" },
  { id: 4, name: "Hornets", city: "Charlotte", abbrev: "CHA", conference: "East" },
  { id: 5, name: "Bulls", city: "Chicago", abbrev: "CHI", conference: "East" },
  { id: 6, name: "Cavaliers", city: "Cleveland", abbrev: "CLE", conference: "East" },
  { id: 7, name: "Mavericks", city: "Dallas", abbrev: "DAL", conference: "West" },
  { id: 8, name: "Nuggets", city: "Denver", abbrev: "DEN", conference: "West" },
  { id: 9, name: "Pistons", city: "Detroit", abbrev: "DET", conference: "East" },
  { id: 10, name: "Warriors", city: "Golden State", abbrev: "GSW", conference: "West" },
  { id: 11, name: "Rockets", city: "Houston", abbrev: "HOU", conference: "West" },
  { id: 12, name: "Pacers", city: "Indiana", abbrev: "IND", conference: "East" },
  { id: 13, name: "Clippers", city: "LA", abbrev: "LAC", conference: "West" },
  { id: 14, name: "Lakers", city: "Los Angeles", abbrev: "LAL", conference: "West" },
  { id: 15, name: "Grizzlies", city: "Memphis", abbrev: "MEM", conference: "West" },
  { id: 16, name: "Heat", city: "Miami", abbrev: "MIA", conference: "East" },
  { id: 17, name: "Bucks", city: "Milwaukee", abbrev: "MIL", conference: "East" },
  { id: 18, name: "Timberwolves", city: "Minnesota", abbrev: "MIN", conference: "West" },
  { id: 19, name: "Pelicans", city: "New Orleans", abbrev: "NOP", conference: "West" },
  { id: 20, name: "Knicks", city: "New York", abbrev: "NYK", conference: "East" },
  { id: 21, name: "Thunder", city: "Oklahoma City", abbrev: "OKC", conference: "West" },
  { id: 22, name: "Magic", city: "Orlando", abbrev: "ORL", conference: "East" },
  { id: 23, name: "76ers", city: "Philadelphia", abbrev: "PHI", conference: "East" },
  { id: 24, name: "Suns", city: "Phoenix", abbrev: "PHX", conference: "West" },
  { id: 25, name: "Trail Blazers", city: "Portland", abbrev: "POR", conference: "West" },
  { id: 26, name: "Kings", city: "Sacramento", abbrev: "SAC", conference: "West" },
  { id: 27, name: "Spurs", city: "San Antonio", abbrev: "SAS", conference: "West" },
  { id: 28, name: "Raptors", city: "Toronto", abbrev: "TOR", conference: "East" },
  { id: 29, name: "Jazz", city: "Utah", abbrev: "UTA", conference: "West" },
  { id: 30, name: "Wizards", city: "Washington", abbrev: "WAS", conference: "East" }
];

async function seedTeams() {
  console.log("🚀 Seeding 30 NBA Teams into 'nba_teams'...");
  
  const batch = db.batch();
  
  nbaTeams.forEach(team => {
    const docRef = db.collection('nba_teams').doc(team.id.toString());
    batch.set(docRef, {
      ...team,
      lastUpdated: new Date().toISOString()
    });
  });

  try {
    await batch.commit();
    console.log("✅ Successfully seeded all 30 NBA teams.");
  } catch (error) {
    console.error("❌ Error seeding teams:", error);
  }
}

seedTeams();