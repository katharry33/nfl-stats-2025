import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

function normalizePropKey(prop: string) {
  return prop.toLowerCase().replace(/[^a-z0-9]/g, "_");
}

export async function GET() {
  try {
    const snapshot = await adminDb.collection("allProps").get();

    if (snapshot.empty) {
      return NextResponse.json({ message: "No documents found to repair." });
    }

    const batch = adminDb.batch();
    let count = 0;

    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      const updates: any = {};

      if (!data.league) updates.league = "nfl";

      if (!data.season && data.gameDate) {
        updates.season = Number(String(data.gameDate).substring(0, 4));
      }

      if (data.prop && !data.propNorm) {
        updates.propNorm = normalizePropKey(data.prop);
      }

      if (data.overUnder) {
        updates.overUnder = data.overUnder.toLowerCase();
      }

      if (Object.keys(updates).length > 0) {
        updates.updatedAt = new Date().toISOString();
        batch.update(doc.ref, updates);
        count++;
      }
    });

    if (count > 0) await batch.commit();

    return NextResponse.json({
      success: true,
      repaired: count,
      total: snapshot.size,
    });
  } catch (err) {
    console.error("[repair-props] Error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
