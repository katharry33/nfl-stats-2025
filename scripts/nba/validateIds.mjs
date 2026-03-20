import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

if (!getApps().length) {
  const serviceAccount = JSON.parse(fs.readFileSync('./serviceAccountKey.json', 'utf8'));
  initializeApp({ credential: cert(serviceAccount) });
}
const db = getFirestore();

const TARGET_NAMES = [
  'Luka Doncic', 'Shai Gilgeous-Alexander', 'Anthony Edwards', 'Tyrese Maxey', 'Jaylen Brown',
  'Kawhi Leonard', 'Nikola Jokic', 'Donovan Mitchell', 'Jalen Brunson', 'Devin Booker',
  'Kevin Durant', 'Jamal Murray', 'Cade Cunningham', 'Victor Wembanyama', 'James Harden',
  'Stephen Curry', 'Karl-Anthony Towns', 'LaMelo Ball', 'Bam Adebayo', 'Chet Holmgren',
  'Paolo Banchero', 'De\'Aaron Fox', 'Scottie Barnes', 'LeBron James', 'Jalen Johnson'
];

async function validate() {
  console.log("🔍 Validating Top 25 against static_nbaIdMap...");
  
  const mapSnap = await db.collection('static_nbaIdMap').get();
  const mapData = mapSnap.docs.reduce((acc, doc) => {
    const data = doc.data();
    // Index by lowercase name for fuzzy matching
    acc[(data.playerName || doc.id).toLowerCase()] = {
      originalName: data.playerName || doc.id,
      bdlId: data.bdlId
    };
    return acc;
  }, {});

  const found = [];
  const missing = [];
  const missingId = [];

  TARGET_NAMES.forEach(name => {
    const match = mapData[name.toLowerCase()];
    if (!match) {
      missing.push(name);
    } else if (!match.bdlId) {
      missingId.push(name);
    } else {
      found.push(name);
    }
  });

  console.log(`\n✅ Found & Ready: ${found.length}`);
  if (missing.length > 0) {
    console.log(`❌ Missing from Collection: ${missing.join(', ')}`);
  }
  if (missingId.length > 0) {
    console.log(`⚠️ In Collection but missing bdlId: ${missingId.join(', ')}`);
  }
}

validate();