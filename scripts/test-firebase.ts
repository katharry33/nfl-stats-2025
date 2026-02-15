// scripts/test-firebase.ts
import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.local from the project root
config({ path: resolve(__dirname, '../.env.local') });

// Debug: Check if env vars loaded
console.log('Env vars loaded:');
console.log('PROJECT_ID:', process.env.FIREBASE_PROJECT_ID);
console.log('CLIENT_EMAIL:', process.env.FIREBASE_CLIENT_EMAIL);
console.log('PRIVATE_KEY (first 50 chars):', process.env.FIREBASE_PRIVATE_KEY?.substring(0, 50));
console.log('---\n');

import { getAdminDb } from '../src/lib/firebase/admin';

async function test() {
  try {
    console.log('Testing Firebase Admin connection...');
    const db = getAdminDb();
    
    const collections = await db.listCollections();
    console.log('✅ Connected! Collections:', collections.map(c => c.id));
    
    // Test a specific query
    const propsSnapshot = await db.collection('allProps_2025').limit(1).get();
    console.log('✅ Sample query worked! Docs found:', propsSnapshot.size);
    
  } catch (error) {
    console.error('❌ Failed:', error);
  }
  process.exit(0);
}

test();