import { NextRequest, NextResponse } from 'next/server';
import { adminDb as db } from '@/lib/firebase/admin';
import { FieldPath } from 'firebase-admin/firestore';

export async function POST(request: NextRequest) {
  try {
    const { date, league } = await request.json();

    if (!date || !league) {
      return NextResponse.json({ error: "Missing date or league" }, { status: 400 });
    }

    const propsRef = db.collection("props");
    const snapshot = await propsRef
      .where("gameDate", "==", date)
      .where("league", "==", league)
      .get();

    if (snapshot.empty) {
      return NextResponse.json({ message: "No props found for this date" });
    }

    const batch = db.batch();
    snapshot.docs.forEach((doc: FirebaseFirestore.QueryDocumentSnapshot) => {
      batch.delete(doc.ref);
    });

    await batch.commit();

    return NextResponse.json({ message: `Successfully cleared ${snapshot.size} props` });
  } catch (error) {
    console.error("Error clearing props:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}