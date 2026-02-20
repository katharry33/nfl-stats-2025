import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin'; // Try the alias first, or relative: '../../../lib/firebase/admin'

export async function GET() {
  try {
    const snapshot = await adminDb.collection('bettingLog').get();
    const batch = adminDb.batch();
    let count = 0;

    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      // If document is missing userId, we add 'dev-user'
      if (!data.userId) {
        batch.update(doc.ref, { userId: 'dev-user' });
        count++;
      }
    });

    if (count > 0) {
      await batch.commit();
    }

    return NextResponse.json({ 
      success: true, 
      migratedCount: count,
      totalChecked: snapshot.size 
    });
  } catch (error: any) {
    console.error("Migration Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}