import { NextRequest, NextResponse } from 'next/server';
import { adminDb, FieldValue } from '@/lib/firebase/admin';

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Bet ID is required' }, { status: 400 });
    }

    await adminDb.collection('bettingLog').doc(id).update({
      ...updates,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Update bet error:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to update bet' 
    }, { status: 500 });
  }
}