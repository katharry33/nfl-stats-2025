// fixNames.js
const admin = require('firebase-admin');
admin.initializeApp({ credential: admin.credential.applicationDefault() });
const db = admin.firestore();

async function fix() {
  const snap = await db.collection('static_nbaIdMap').get();
  for (const doc of snap.docs) {
    const data = doc.data();
    if (data.name && data.name !== "Unknown Player") {
      await doc.ref.update({ playerName: data.name });
      console.log(`Fixed: ${data.name}`);
    }
  }
}
fix();