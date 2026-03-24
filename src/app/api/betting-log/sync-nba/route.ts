// src/app/api/betting-log/sync-nba/route.ts
export async function POST(req: Request) {
    try {
      // Force the collection to the NBA one specifically
      const collectionName = 'bettingLogNba_2025';
      
      // 1. Fetch pending bets from ONLY the NBA collection
      const betsToSync = await adminDb.collection(collectionName)
        .where('status', '==', 'pending')
        .get();
  
      // 2. Perform scoring logic...
      // 3. Update the documents in the same NBA collection
      
      return NextResponse.json({ updated: betsToSync.size });
    } catch (error) {
      return NextResponse.json({ error: "Sync failed" }, { status: 500 });
    }
  }