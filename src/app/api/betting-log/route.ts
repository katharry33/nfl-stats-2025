import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const db = getAdminDb();
    
    // 1. Fetch from ALL possible legacy collections
    const collections = ['bettingLog', '2025_bets', 'bets'];
    const allBets: any[] = [];

    for (const colName of collections) {
      const snapshot = await db.collection(colName).get();
      snapshot.forEach(doc => {
        allBets.push({ id: doc.id, ...doc.data(), sourceCollection: colName });
      });
    }

    // 2. Sort by date manually since we merged arrays
    allBets.sort((a, b) => {
      const dateA = a.manualDate?.seconds || 0;
      const dateB = b.manualDate?.seconds || 0;
      return dateB - dateA;
    });

    return NextResponse.json(allBets);
  } catch (error: any) {
    console.error('GET Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const db = getAdminDb();
    const body = await request.json();

    // Ensure date is a valid Firestore Timestamp
    const dateObj = body.manualDate ? new Date(`${body.manualDate}T12:00:00`) : new Date();

    const betData = {
      ...body,
      manualDate: Timestamp.fromDate(dateObj),
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      stake: Number(body.stake || 0),
      odds: Number(body.odds || 0),
    };

    const docRef = await db.collection('bettingLog').add(betData);
    return NextResponse.json({ success: true, id: docRef.id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}