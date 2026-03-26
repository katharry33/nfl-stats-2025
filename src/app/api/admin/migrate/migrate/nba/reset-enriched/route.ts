import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin'; 
import * as admin from 'firebase-admin'; // Import the full SDK here
import { QueryDocumentSnapshot } from 'firebase-admin/firestore';

export async function GET() {
  const targetDate = '2026-03-23'; // The date you want to re-run

  try {
    const props = await adminDb.collection('nbaProps_2025')
      .where('gameDate', '==', targetDate)
      .get();

    if (props.empty) {
      return NextResponse.json({ message: "No props found for this date." });
    }

    const batch = adminDb.batch();

    props.docs.forEach((doc: QueryDocumentSnapshot) => {
      batch.update(doc.ref, {
        enriched: false,
        playerAvg: admin.firestore.FieldValue.delete(),
        lastUpdated: admin.firestore.FieldValue.delete()
      });
    });

    await batch.commit();

    return NextResponse.json({ 
      success: true, 
      message: `Reset ${props.size} props for ${targetDate}. You can now re-run enrichment.` 
    });

  } catch (error: any) {
    console.error("Reset Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}