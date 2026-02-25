// app/api/delete-bet/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const docId = searchParams.get('id');

  console.log('🗑️ DELETE request received for ID:', docId);

  if (!docId) {
    console.error('❌ No document ID provided');
    return NextResponse.json({ error: "No Document ID provided" }, { status: 400 });
  }

  try {
    const batch = adminDb.batch();
    let docsFound = 0;

    // CASE 1: Try to delete the document directly (for single bets)
    const docRef = adminDb.collection('bettingLog').doc(docId);
    const docSnap = await docRef.get();
    
    if (docSnap.exists) {
      console.log('📄 Found direct document:', docId);
      batch.delete(docRef);
      docsFound++;
    }

    // CASE 2: Check both parlayid and parlayId (Legacy vs New casing)
    const parlayFields = ['parlayid', 'parlayId', 'dk_parlay_id'];
        
    for (const field of parlayFields) {
      const query = await adminDb
        .collection('bettingLog')
        .where(field, '==', docId)
        .get();

      if (!query.empty) {
        console.log(`🔗 Found ${query.size} legs via ${field}:`, docId);
        query.docs.forEach(doc => {
          // Check if we've already marked this for deletion to avoid batch errors
          if (!docSnap.exists || doc.id !== docId) {
            batch.delete(doc.ref);
            docsFound++;
          }
        });
      }
    }

    // Execute batch delete if we found anything
    if (docsFound > 0) {
      await batch.commit();
      console.log(`✅ Successfully deleted ${docsFound} document(s)`);
      return NextResponse.json({ 
        success: true, 
        message: `${docsFound} document(s) deleted` 
      });
    } else {
      console.error('❌ No documents found with ID:', docId);
      return NextResponse.json({ 
        error: "Bet not found" 
      }, { status: 404 });
    }

  } catch (error: any) {
    console.error("❌ Delete Error:", error);
    return NextResponse.json({ 
      error: error.message || 'Failed to delete bet' 
    }, { status: 500 });
  }
}
