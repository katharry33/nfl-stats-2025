import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    console.log("📥 Received update request:", JSON.stringify(body, null, 2));

    const { id, ...updates } = body;

    // Validation
    if (!id || typeof id !== 'string') {
      console.error("❌ Invalid or missing ID:", id);
      return NextResponse.json(
        { error: "Valid document ID is required" }, 
        { status: 400 }
      );
    }

    if (Object.keys(updates).length === 0) {
      console.error("❌ No update fields provided");
      return NextResponse.json(
        { error: "No fields to update" }, 
        { status: 400 }
      );
    }

    const db = getAdminDb();
    const betRef = db.collection("betting_logs").doc(id);
    
    // Check if document exists
    const doc = await betRef.get();
    if (!doc.exists) {
      console.error(`❌ Document ${id} not found in betting_logs`);
      return NextResponse.json(
        { error: "Bet not found in database" }, 
        { status: 404 }
      );
    }

    // Prepare update data - remove undefined values
    const updateData = Object.entries(updates).reduce((acc, [key, value]) => {
      if (value !== undefined) {
        acc[key] = value;
      }
      return acc;
    }, {} as Record<string, any>);

    // Add timestamp
    updateData.updatedAt = new Date().toISOString();

    console.log("📝 Updating document with:", JSON.stringify(updateData, null, 2));

    // Perform update
    await betRef.update(updateData);

    // Fetch updated document
    const updatedDoc = await betRef.get();
    const updatedData = { id: updatedDoc.id, ...updatedDoc.data() };

    console.log("✅ Update successful");

    return NextResponse.json({ 
      success: true, 
      data: updatedData 
    });

  } catch (error: any) {
    console.error("❌ Update Error:", error);
    
    // Handle specific Firestore errors
    if (error.code === 'permission-denied') {
      return NextResponse.json(
        { error: "Permission denied. Check Firebase rules." }, 
        { status: 403 }
      );
    }

    if (error.code === 'not-found') {
      return NextResponse.json(
        { error: "Document not found" }, 
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to update bet" }, 
      { status: 500 }
    );
  }
}