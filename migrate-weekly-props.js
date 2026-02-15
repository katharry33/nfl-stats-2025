/**
 * Migration Script: Merge weeklyProps_2025 into allProps_2025
 * 
 * This script reads all documents from weeklyProps_2025 and writes them to allProps_2025.
 * Run this once to consolidate your historical props data.
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin (adjust the path to your service account key if needed)
// If already initialized in your app, you can skip this
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    // Or use a service account:
    // credential: admin.credential.cert(require('./path/to/serviceAccountKey.json'))
  });
}

const db = admin.firestore();

async function migrateWeeklyPropsToAllProps() {
  console.log('🚀 Starting migration: weeklyProps_2025 → allProps_2025');
  
  const weeklyPropsRef = db.collection('weeklyProps_2025');
  const allPropsRef = db.collection('allProps_2025');
  
  try {
    // Get all documents from weeklyProps_2025
    console.log('📖 Reading documents from weeklyProps_2025...');
    const snapshot = await weeklyPropsRef.get();
    
    if (snapshot.empty) {
      console.log('⚠️  No documents found in weeklyProps_2025');
      return;
    }
    
    console.log(`✅ Found ${snapshot.size} documents to migrate`);
    
    // Batch write for better performance (max 500 operations per batch)
    const batchSize = 500;
    let batch = db.batch();
    let operationCount = 0;
    let totalMigrated = 0;
    
    for (const doc of snapshot.docs) {
      const data = doc.data();
      
      // Create a reference in allProps_2025 with the same document ID
      const allPropsDocRef = allPropsRef.doc(doc.id);
      
      // Add to batch (using set with merge to avoid overwriting if exists)
      batch.set(allPropsDocRef, data, { merge: true });
      operationCount++;
      
      // Commit batch when it reaches 500 operations
      if (operationCount === batchSize) {
        await batch.commit();
        totalMigrated += operationCount;
        console.log(`✍️  Migrated ${totalMigrated} documents...`);
        batch = db.batch();
        operationCount = 0;
      }
    }
    
    // Commit remaining operations
    if (operationCount > 0) {
      await batch.commit();
      totalMigrated += operationCount;
    }
    
    console.log(`🎉 Migration complete! ${totalMigrated} documents migrated to allProps_2025`);
    
    // Optionally verify the count
    const verifySnapshot = await allPropsRef.get();
    console.log(`📊 Total documents in allProps_2025: ${verifySnapshot.size}`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run the migration
migrateWeeklyPropsToAllProps()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });