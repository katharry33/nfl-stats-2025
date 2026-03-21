const admin = require('firebase-admin');
const db = admin.firestore();

async function migrateCollection(oldName, newName) {
  const oldRef = db.collection(oldName);
  const newRef = db.collection(newName);
  const snapshot = await oldRef.get();

  if (snapshot.empty) {
    console.log('No documents found in ' + oldName);
    return;
  }

  const batch = db.batch();

  snapshot.docs.forEach((doc) => {
    const newData = doc.data();
    // Create a new document with the same ID in the new collection
    const newDocRef = newRef.doc(doc.id);
    batch.set(newDocRef, newData);
  });

  await batch.commit();
  console.log(`Successfully migrated ${snapshot.size} docs to ${newName}`);
  
  // Optional: Delete old docs (Run this ONLY after verifying the new collection)
  // await Promise.all(snapshot.docs.map(doc => doc.ref.delete()));
}

migrateCollection('bettingLog', 'bettingLogNba_2025');