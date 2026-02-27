import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin'; // Ensure your admin config is exported here
import { auth } from '@clerk/nextjs/server'; // Or your preferred auth provider

export async function POST(req: Request) {
  try {
    const { userId: authId } = await auth();
    if (!authId) return new NextResponse('Unauthorized', { status: 401 });

    const body = await req.json();
    const { id, ...betData } = body;

    // 1. If 'id' exists, we are UPDATING an existing bet from the log
    if (id) {
      await adminDb.collection('user_bets').doc(id).update({
        ...betData,
        updatedAt: new Date().toISOString()
      });
      return NextResponse.json({ success: true, message: 'Bet updated' });
    }

    // 2. If no 'id', we are CREATING a new bet from the Parlay Studio
    const newDocRef = await adminDb.collection('user_bets').add({
      ...betData,
      userId: authId,
      createdAt: new Date().toISOString()
    });

    return NextResponse.json({ success: true, id: newDocRef.id });
  } catch (error: any) {
    console.error('Admin Save Error:', error);
    return new NextResponse(error.message, { status: 500 });
  }
}