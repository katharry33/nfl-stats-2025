import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Bet ID is required' }, { status: 400 });
    }

    await adminDb.collection('bettingLog').doc(id).delete();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete bet error:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to delete bet' 
    }, { status: 500 });
  }
}