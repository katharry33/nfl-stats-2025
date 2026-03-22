import { adminDb } from "@/lib/firebase/admin";
import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore"; 

export async function POST(request: Request) {
  try {
    const { date, league } = await request.json();

    if (!date || !league) {
      return NextResponse.json({ error: "Missing date or league" }, { status: 400 });
    }

    const propsRef = adminDb.collection("props");
    const snapshot = await propsRef
      .where("gameDate", "==", date)
      .where("league", "==", league)
      .get();

    if (snapshot.empty) {
      return NextResponse.json({ message: "No props found for this date" });
    }

    const batch = adminDb.batch();
    // Added explicit type for 'doc' to fix the (doc: any) error
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