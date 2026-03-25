// src/app/api/betting-log/sync-nfl/route.ts
import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

export async function POST(req: Request) {
    try {
      // Force the collection to the NFL one specifically
      const collectionName = 'bettingLogNfl_2025';
      
      // 1. Fetch pending bets from ONLY the NFL collection
      const betsToSync = await adminDb.collection(collectionName)
        .where('status', '==', 'pending')
        .get();
  
      // 2. Perform scoring logic...
      // 3. Update the documents in the same NFL collection
      
      return NextResponse.json({ updated: betsToSync.size });
    } catch (error) {
      return NextResponse.json({ error: "Sync failed" }, { status: 500 });
    }
  }