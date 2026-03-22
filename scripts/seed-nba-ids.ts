import { adminDb } from '../src/lib/firebase/admin';

interface PlayerEntry {
  player: string;
  team: string;
  bdlId: number;
  brid: string;
  brConf: string; // Add this line
}

const players: PlayerEntry[] = [
  { player: "LeBron James", team: "LAL", bdlId: 237, brid: "jamesle01", brConf: "West" },
  { player: "Stephen Curry", team: "GSW", bdlId: 115, brid: "curryst01", brConf: "West" },
  { player: "Kevin Durant", team: "PHX", bdlId: 140, brid: "duranke01", brConf: "West" },
  { player: "Nikola Jokic", team: "DEN", bdlId: 246, brid: "jokicni01", brConf: "West" },
  { player: "Luka Doncic", team: "DAL", bdlId: 132, brid: "doncilu01", brConf: "West" },
  { player: "Giannis Antetokounmpo", team: "MIL", bdlId: 25, brid: "antetgi01", brConf: "East" },
  { player: "Jayson Tatum", team: "BOS", bdlId: 434, brid: "tatumja01", brConf: "East" },
  { player: "Joel Embiid", team: "PHI", bdlId: 145, brid: "embiijo01", brConf: "East" },
  { player: "Jimmy Butler", team: "MIA", bdlId: 79, brid: "butleji01", brConf: "East" },
  { player: "Trae Young", team: "ATL", bdlId: 490, brid: "youngtr01", brConf: "East" },
];

async function seedNbaIds() {
  const collectionRef = adminDb.collection('nba-player-ids');
  const batch = adminDb.batch();

  players.forEach(player => {
    const docRef = collectionRef.doc(player.brid);
    batch.set(docRef, player);
  });

  try {
    await batch.commit();
    console.log(`Successfully seeded ${players.length} NBA player IDs.`);
  } catch (error) {
    console.error('Error seeding NBA player IDs:', error);
  }
}

seedNbaIds();
