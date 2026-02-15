import { config } from 'dotenv';
import { join } from 'path';

// This points to the root of your project regardless of where the script lives
config({ path: join(process.cwd(), '.env.local') });

import { getAdminDb } from '../src/lib/firebase/admin';

async function migrate() {
  try {
    const db = getAdminDb();
    console.log("✅ Successfully connected to Firebase Admin via CLI");
    
    // ... rest of your migration logic ...
    
  } catch (e) {
    console.error("❌ Failed:", e);
  }
}

migrate();