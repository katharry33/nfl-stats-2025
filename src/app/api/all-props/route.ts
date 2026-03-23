import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  
  const seasonQuery = searchParams.get('season') || '2025';
  const weekQuery   = searchParams.get('week');
  const search      = (searchParams.get('search') || '').toLowerCase().trim();
  const offset      = parseInt(searchParams.get('offset') || '0', 10);
  const limit       = Math.min(parseInt(searchParams.get('limit') || '50', 10), 500);

  try {
    // 🎯 Use the master collection
    let q: FirebaseFirestore.Query = adminDb.collection('allProps');

    /**
     * 🔥 REMOVED League Filter: 
     * Since the 'league' field is missing from your docs, 
     * we skip the .where('league') call so data actually shows up.
     */

    // ─── EXECUTE QUERY ───
    const snap = await q.limit(1000).get(); // Pull a larger set to filter in-memory
    
    if (snap.empty) {
      return NextResponse.json([]);
    }

    let results = snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as any));

    // ─── IN-MEMORY FILTERING (More flexible than Firestore) ───
    const filtered = results.filter(d => {
      // 1. Season Check: Look at 'season' field OR the first 4 chars of 'gameDate' or 'game date'
      const dateStr = d.gameDate || d['game date'] || "";
      const docSeason = d.season?.toString() || dateStr.substring(0, 4);
      if (seasonQuery && docSeason !== seasonQuery) return false;

      // 2. Week Check
      if (weekQuery && weekQuery !== 'all') {
        if (String(d.week) !== String(weekQuery)) return false;
      }

      // 3. Search Check
      if (search) {
        const playerName = (d.player || "").toLowerCase();
        if (!playerName.includes(search)) return false;
      }

      return true;
    });

    // ─── NORMALIZATION (Mapping your specific field names) ───
    const normalized = filtered.map(d => ({
      id: d.id,
      player: d.player || 'Unknown',
      team: d.team || '—',
      prop: d.prop || 'Prop',
      line: Number(d.line || 0),
      // Handling the space in your field name "over under"
      overUnder: d.overUnder || d['over under'] || 'Over',
      gameDate: d.gameDate || d['game date'] || '—',
      week: d.week || null,
      odds: d.odds || -110,
      matchup: d.matchup || '—',
      actualResult: d.actualResult || d.result || null,
    }));

    // Sort: Newest Week first
    normalized.sort((a, b) => (Number(b.week) || 0) - (Number(a.week) || 0));

    const paginated = normalized.slice(offset, offset + limit);
    return NextResponse.json(paginated);

  } catch (error: any) {
    console.error('❌ Firestore Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}