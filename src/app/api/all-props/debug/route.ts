// src/app/api/all-props/debug/route.ts - NEW FILE
import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const db = adminDb;
    
    console.log('\n🔍 DEBUG: Checking allProps_2025 collection...\n');
    
    // Get first 10 docs to see what fields exist
    const snapshot = await db.collection('allProps_2025')
      .limit(10)
      .get();
    
    const docs = snapshot.docs.map((doc: any) => {
      const data = doc.data();
      return {
        id: doc.id,
        fields: Object.keys(data),
        week: data.week || data.Week,
        player: data.player || data.Player,
        sampleData: data,
      };
    });
    
    return NextResponse.json({
      totalDocs: snapshot.size,
      sampleDocs: docs,
    });
    
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}