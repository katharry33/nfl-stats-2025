// src/app/api/all-props/route.ts
import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { firestore } from 'firebase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/all-props
// Querystring params: week, prop, team, player, season
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const db = getAdminDb();
    
    let q: firestore.Query = db.collection('props');

    // Robust Filtering
    const season = searchParams.get('season');
    const week = searchParams.get('week');
    const team = searchParams.get('team')?.toUpperCase().trim();
    const player = searchParams.get('player');
    const prop = searchParams.get('prop');

    if (season) {
        q = q.where('Season', '==', season);
    }
    // Convert week to number if your DB stores it as a number
    if (week && week !== 'all') {
        q = q.where('Week', '==', parseInt(week));
    }
    if (team) {
        q = q.where('Team', '==', team);
    }
    if (prop && prop !== 'all') {
        q = q.where('Prop', '==', prop);
    }

    const snapshot = await q.get();
    let results = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));

    // Manual Client-side filter for Player (Firestore doesn't do case-insensitive well)
    if (player) {
      const search = player.toLowerCase();
      results = results.filter((p: any) => 
        p.Player?.toLowerCase().includes(search) || p.player?.toLowerCase().includes(search)
      );
    }
    
    return NextResponse.json(results);
  } catch (error: any) {
    console.error("API Error fetching all props:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
