// scripts/migrate-bets.ts
import { config } from 'dotenv';
import { join } from 'path';

// Load .env.local from the root
config({ path: join(process.cwd(), '.env.local') });

// Using relative path to ensure it finds your existing admin initialization
import { adminDb } from '../src/lib/firebase/admin';

async function migrate() {
  console.log("🚀 Starting migration...");
  
  try {
    const snapshot = await adminDb.collection('bettingLog').get();
    const batch = adminDb.batch();
    let count = 0;

    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      // Only stamp documents that don't have a userId
      if (!data.userId) {
        batch.update(doc.ref, { userId: 'dev-user' });
        count++;
      }
    });

    if (count > 0) {
      await batch.commit();
      console.log(`✅ Success! Migrated ${count} bets to "dev-user".`);
    } else {
      console.log("ℹ️ All bets already have a userId. No changes made.");
    }
  } catch (error) {
    console.error("❌ Migration failed:", error);
  }
}

migrate();