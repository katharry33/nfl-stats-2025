import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin'; 
import * as admin from 'firebase-admin';
import { QueryDocumentSnapshot, DocumentData } from 'firebase-admin/firestore';

const PAGE_SIZE = 25;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toISO(val: any): string | null {
  if (!val) return null;
  let date: Date;
  
  if (typeof val?.toDate === 'function') {
    date = val.toDate();
  } else {
    const secs = val?.seconds ?? val?._seconds;
    if (secs != null) {
      date = new Date(Number(secs) * 1000);
    } else if (typeof val === 'string' && val.length > 0) {
      date = new Date(val);
    } else {
      return null;
    }
  }
  
  // Return YYYY-MM-DD to keep the UI consistent and avoid timezone shifts
  return date.toISOString().split('T')[0];
}

function normLeg(data: any, docId: string) {
  let line = 0;
  let selection = String(data.selection ?? data.overUnder ?? data['Over/Under?'] ?? '').trim();
  const rawLine = data.line ?? data.Line;
  if (typeof rawLine === 'string') {
    const m = rawLine.match(/^(over|under)\s+([\d.]+)/i);
    if (m) {
      if (!selection) selection = m[1].charAt(0).toUpperCase() + m[1].slice(1).toLowerCase();
      line = parseFloat(m[2]);
    } else {
      line = parseFloat(rawLine) || 0;
    }
  } else {
    line = Number(rawLine) || 0;
  }

  return {
    id:         docId,
    player:     String(data.player ?? data.playerteam ?? data.Player ?? '').trim(),
    prop:       String(data.prop   ?? data.Prop ?? '').trim(),
    line,
    selection,
    odds:       Number(data.odds ?? data.Odds) || null,
    matchup:    String(data.matchup ?? data.Matchup ?? '').trim(),
    week:       Number(data.week ?? data.Week) || null,
    status:     String(data.result ?? data.status ?? 'pending').toLowerCase(),
    gameDate:   toISO(data.gameDate ?? data.date ?? data['Game Date']),
    team:       String(data.team ?? data.Team ?? '').trim(),
  };
}

function calcPayout(stake: number | null, odds: number | null): number | null {
  if (!stake || !odds) return null;
  return odds > 0
    ? parseFloat((stake * (odds / 100) + stake).toFixed(2))
    : parseFloat((stake * (100 / Math.abs(odds)) + stake).toFixed(2));
}

// ─── GET Route (Fetch & Group) ───────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const player   = (searchParams.get('player')  ?? '').trim().toLowerCase();
    const propType = (searchParams.get('propType') ?? '').trim().toLowerCase();
    const week     =  searchParams.get('week')     ?? '';
    const cursor   =  searchParams.get('cursor')   ?? '';
    const limit    = Math.min(parseInt(searchParams.get('limit') ?? String(PAGE_SIZE)), 100);

    const weekNum = week && week !== 'all' ? parseInt(week, 10) : null;

    let q: FirebaseFirestore.Query = adminDb.collection('bettingLog');
    if (weekNum !== null && !isNaN(weekNum)) q = q.where('week', '==', weekNum);

    const snap = await q.limit(2000).get();
    
    const legDocs:    { id: string; data: any }[] = [];
    const headerDocs: { id: string; data: any }[] = [];

    snap.docs.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
      const d = doc.data();
      if (Array.isArray(d.legs) && d.legs.length === 0) {
        headerDocs.push({ id: doc.id, data: d });
      } else {
        legDocs.push({ id: doc.id, data: d });
      }
    });

    const parlayMap = new Map<string, { id: string; data: any }[]>();
    const singleDocs: { id: string; data: any }[] = [];

    legDocs.forEach((doc) => {
      const pid: string | undefined = doc.data.parlayid ?? doc.data.parlayId;
      if (pid && pid !== "") {
        if (!parlayMap.has(pid)) parlayMap.set(pid, []);
        parlayMap.get(pid)!.push(doc);
      } else {
        singleDocs.push(doc);
      }
    });

    type BetRow = {
      id: string; isParlay: boolean; legsEmpty: boolean;
      legs: ReturnType<typeof normLeg>[];
      week: number | null; status: string;
      odds: number | null; stake: number | null;
      payout: number | null; createdAt: string | null;
    };

    const allBets: BetRow[] = [];

    for (const [parlayId, docs] of parlayMap) {
      const legs  = docs.map(d => normLeg(d.data, d.id));
      const first = docs[0].data;
      const stake = Number(first.stake ?? first.wager) || null;
      const odds  = Number(first.parlayOdds ?? first.odds) || null;
      allBets.push({
        id: parlayId, isParlay: true, legsEmpty: false, legs,
        week:      legs[0]?.week ?? null,
        status:    String(first.result ?? first.status ?? 'pending').toLowerCase(),
        odds, stake, payout: calcPayout(stake, odds),
        createdAt: toISO(first.createdAt ?? first._updatedAt ?? first.updatedAt),
      });
    }

    singleDocs.forEach((doc: { id: string; data: any }) => {
      const leg   = normLeg(doc.data, doc.id);
      const stake = Number(doc.data.stake ?? doc.data.wager) || null;
      allBets.push({
        id: doc.id, isParlay: false, legsEmpty: false, legs: [leg],
        week:      leg.week, status: leg.status, odds: leg.odds, stake,
        payout:    calcPayout(stake, leg.odds),
        createdAt: toISO(doc.data.createdAt ?? doc.data._updatedAt ?? doc.data.date),
      });
    });

    headerDocs.forEach((doc: { id: string; data: any }) => {
      const d     = doc.data;
      const stake = Number(d.stake ?? d.wager) || null;
      const odds  = Number(d.parlayOdds ?? d.odds) || null;
      allBets.push({
        id: doc.id, isParlay: true, legsEmpty: true, legs: [],
        week:      Number(d.week) || null,
        status:    String(d.result ?? d.status ?? 'pending').toLowerCase(),
        odds, stake, payout: calcPayout(stake, odds),
        createdAt: toISO(d.createdAt ?? d._updatedAt ?? d.updatedAt),
      });
    });

    let filtered = allBets;
    if (player) {
      filtered = filtered.filter(b => b.legs.some(l => l.player.toLowerCase().includes(player)));
    }
    if (propType) {
      filtered = filtered.filter(b => b.legs.some(l => l.prop.toLowerCase().includes(propType)));
    }

    filtered.sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime());

    const propTypes = [...new Set(allBets.flatMap(b => b.legs.map(l => l.prop)).filter(Boolean))].sort();
    const startIdx   = cursor ? filtered.findIndex(b => b.id === cursor) + 1 : 0;
    const page       = filtered.slice(startIdx, startIdx + limit);
    const hasMore    = filtered.length > startIdx + limit;
    const nextCursor = hasMore ? (page[page.length - 1]?.id ?? null) : null;

    return NextResponse.json({ bets: page, hasMore, nextCursor, totalCount: filtered.length, propTypes });

  } catch (err: any) {
    console.error('❌ GET Error:', err);
    return NextResponse.json({ error: err.message, bets: [], hasMore: false }, { status: 500 });
  }
}

// ─── PUT Route (Update Single or Parlay) ─────────────────────────────────────

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;
    console.log("📥 RECEIVED UPDATE:", JSON.stringify(body));
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    const db = adminDb;
    const updateData: Record<string, any> = { ...updates };
    
    // 1. Numeric conversions
    if (updateData.stake) updateData.stake = Number(updateData.stake);
    if (updateData.odds) updateData.odds = Number(updateData.odds);
    if (updateData.week) updateData.week = Number(updateData.week);

    // 2. TIMEZONE SAFE DATE CONVERSION
    // Use Noon UTC to prevent the "jump" to the next day
    const dateKey = updates.gameDate ? 'gameDate' : (updates.date ? 'date' : null);
    if (dateKey && typeof updates[dateKey] === 'string') {
      const [year, month, day] = updates[dateKey].split('-').map(Number);
      if (year && month && day) {
        const safeDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
        updateData[dateKey] = admin.firestore.Timestamp.fromDate(safeDate);
      }
    }

    updateData.updatedAt = admin.firestore.FieldValue.serverTimestamp();

    const betRef = db.collection('bettingLog').doc(id);
    const doc = await betRef.get();

    if (doc.exists) {
      await betRef.update(updateData);
      return NextResponse.json({ success: true });
    } else {
      // If direct doc not found, update all legs in the parlay group
      let parlayLegs = await db.collection('bettingLog').where('parlayid', '==', id).get();
      if (parlayLegs.empty) {
        parlayLegs = await db.collection('bettingLog').where('parlayId', '==', id).get();
      }

      if (parlayLegs.empty) return NextResponse.json({ error: "Bet not found" }, { status: 404 });

      const batch = db.batch();
      parlayLegs.docs.forEach((legDoc: QueryDocumentSnapshot<DocumentData>) => {
        batch.update(legDoc.ref, updateData);
      });
      await batch.commit();
      return NextResponse.json({ success: true });
    }
  } catch (err: any) {
    console.error('❌ PUT Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ─── DELETE Route (Delete Single or Parlay) ───────────────────────────────────

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }

    const db = adminDb;
    const betRef = db.collection('bettingLog').doc(id);
    const doc = await betRef.get();

    if (doc.exists) {
      await betRef.delete();
      return NextResponse.json({ success: true, message: `Deleted single bet ${id}` });
    } else {
      // If direct doc not found, it might be a parlay, so delete all legs in the group
      let parlayLegsQuery = db.collection('bettingLog').where('parlayid', '==', id);
      let parlayLegs = await parlayLegsQuery.get();

      if (parlayLegs.empty) {
        parlayLegsQuery = db.collection('bettingLog').where('parlayId', '==', id);
        parlayLegs = await parlayLegsQuery.get();
      }

      if (parlayLegs.empty) {
        return NextResponse.json({ error: "Bet not found" }, { status: 404 });
      }

      const batch = db.batch();
      parlayLegs.docs.forEach((legDoc: QueryDocumentSnapshot<DocumentData>) => {
        batch.delete(legDoc.ref);
      });
      await batch.commit();
      return NextResponse.json({ success: true, message: `Deleted ${parlayLegs.size} parlay legs for ${id}` });
    }
  } catch (err: any) {
    console.error('❌ DELETE Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
