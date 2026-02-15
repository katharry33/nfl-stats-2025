// 1. Changed to import what you actually export
import { adminDb, getAdminApp } from '../src/lib/firebase/admin';

async function mergeCollections() {
  const sourceCol = 'weeklyProps_2025';
  const destCol = 'allProps_2025';

  console.log(`🚀 Starting merge: ${sourceCol} -> ${destCol}`);

  const snapshot = await adminDb.collection(sourceCol).get();
  
  if (snapshot.empty) {
    console.log('Empty source collection. Nothing to merge.');
    return;
  }

  const bulkWriter = adminDb.bulkWriter();

  bulkWriter.onWriteError((error) => {
    // 2. Changed .getMessage() to .message
    console.error(`❌ Write failed: ${error.message}`);
    return false; 
  });

  snapshot.docs.forEach((doc) => {
    const data = doc.data();
    const destRef = adminDb.collection(destCol).doc(doc.id);

    bulkWriter.set(destRef, {
      ...data,
      // 3. Since we don't have the raw 'admin' object, we can omit the 
      // serverTimestamp or just use a standard Date if needed.
      lastMergedAt: new Date().toISOString(),
      sourceCollection: sourceCol 
    }, { merge: true });
  });

  await bulkWriter.close();
  console.log(`✅ Successfully merged ${snapshot.size} documents into ${destCol}.`);
}

mergeCollections().catch(console.error);