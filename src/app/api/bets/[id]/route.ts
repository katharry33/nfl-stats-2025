import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase/admin';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await req.json();

    // Extract Firebase ID token
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;

    let uid = "anon";

    if (token) {
      try {
        const decoded = await adminAuth.verifyIdToken(token);
        uid = decoded.uid;
      } catch (err) {
        console.warn("Invalid token, falling back to anon");
      }
    }

    // Allowed bet fields
    const allowed = ["betAmount", "betStatus", "parlayId", "notes"];
    const update: Record<string, any> = {
      updatedAt: new Date().toISOString(),
    };

    for (const key of allowed) {
      if (key in body) update[key] = body[key];
    }

    if (Object.keys(update).length === 1) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const ref = adminDb.collection("users").doc(uid).collection("bets").doc(id);
    await ref.set(update, { merge: true });

    return NextResponse.json({ success: true, id, uid });
  } catch (err) {
    console.error("[/api/bets/:id] Error:", err);
    return NextResponse.json({ error: "Failed to update bet" }, { status: 500 });
  }
}
