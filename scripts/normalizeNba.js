const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault()
  });
}

const db = admin.firestore();

async function normalizeNba() {
  console.log("🏀 Normalizing NBA Registry...");
  const snapshot = await db.collection('static_nbaIdMap').get();
  
  const batch = db.batch();
  
  snapshot.docs.forEach(doc => {
    const data = doc.data();
    // Create playerName if it doesn't exist
    const playerName = data.playerName || `${data.first_name || ''} ${data.last_name || ''}`.trim();
    
    batch.set(doc.ref, {
      playerName: playerName,
      sport: 'NBA', // Critical for the new Hub filter
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  });

  await batch.commit();
  console.log("✅ NBA Registry Normalized.");
}

normalizeNba();