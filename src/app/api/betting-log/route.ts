import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin'; 
import * as admin from 'firebase-admin';
import { QueryDocumentSnapshot, DocumentData } from 'firebase-admin/firestore';
import { BetLeg } from '@/lib/types';

const PAGE_SIZE = 25;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toISO(val: any): string | null {
  if (!val) return null;
  let date: Date;
  
  try {
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
    return isNaN(date.getTime()) ? null : date.toISOString().split('T')[0];
  } catch {
    return null;
  }
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
    id: docId,
    player: String(data.player ?? data.playerteam ?? data.Player ?? '').trim(),
    prop: String(data.prop ?? data.Prop ?? '').trim(),
    line,
    selection,
    odds: Number(data.odds ?? data.Odds) || null,
    matchup: String(data.matchup ?? data.Matchup ?? '').trim(),
    week: Number(data.week ?? data.Week) || null,
    status: String(data.result ?? data.status ?? 'pending').toLowerCase(),
    gameDate: toISO(data.gameDate ?? data.date ?? data['Game Date']),
    team: String(data.team ?? data.Team ?? '').trim(),
  };
}

function calcPayout(stake: number | null, odds: number | null): number | null {
  if (!stake || !odds) return null;
  const payout = odds > 0
    ? (stake * (odds / 100) + stake)
    : (stake * (100 / Math.abs(odds)) + stake);
  return parseFloat(payout.toFixed(2));
}

// ─── GET Route ───────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const player = searchParams.get('player')?.trim().toLowerCase() || '';
    const propType = searchParams.get('propType')?.trim().toLowerCase() || '';
    const week = searchParams.get('week') || '';
    const cursor = searchParams.get('cursor') || '';
    const limit = Math.min(parseInt(searchParams.get('limit') ?? String(PAGE_SIZE)), 100);

    const weekNum = week && week !== 'all' ? parseInt(week, 10) : null;

    let q: admin.firestore.Query = adminDb.collection('bettingLog');
    if (weekNum !== null && !isNaN(weekNum)) q = q.where('week', '==', weekNum);

    const snap = await q.orderBy('createdAt', 'desc').limit(1000).get();

    // Map to group by Parlay ID or Doc ID
    const betGroups = new Map<string, any>();

    snap.docs.forEach((doc) => {
      const d = doc.data();
      const pid = d.parlayid ?? d.parlayId ?? doc.id; // Fallback to doc.id for singles
      const isParlay = !!(d.parlayid ?? d.parlayId);
      
      if (!betGroups.has(pid)) {
        const stake = Number(d.stake ?? d.wager ?? d.parlayStake) || null;
        const odds = Number(d.parlayOdds ?? d.odds) || null;
        
        betGroups.set(pid, {
          id: pid,
          isParlay,
          legs: [],
          week: Number(d.week) || null,
          status: String(d.result ?? d.status ?? 'pending').toLowerCase(),
          odds,
          stake,
          payout: calcPayout(stake, odds),
          createdAt: toISO(d.createdAt ?? d._updatedAt ?? d.updatedAt ?? d.date),
        });
      }

      // Only add to legs if it's not a "Header Only" doc
      if (!Array.isArray(d.legs) || d.legs.length > 0 || (d.player || d.prop)) {
        betGroups.get(pid).legs.push(normLeg(d, doc.id));
      }
    });

    let allBets = Array.from(betGroups.values());

    // Filter logic
    if (player) {
      allBets = allBets.filter(b => b.legs.some((l: any) => l.player.toLowerCase().includes(player)));
    }
    if (propType) {
      allBets = allBets.filter(b => b.legs.some((l: any) => l.prop.toLowerCase().includes(propType)));
    }

    const propTypes = [...new Set(allBets.flatMap(b => b.legs.map((l: any) => l.prop)).filter(Boolean))].sort();
    
    // Pagination
    const startIdx = cursor ? allBets.findIndex(b => b.id === cursor) + 1 : 0;
    const page = allBets.slice(startIdx, startIdx + limit);
    const hasMore = allBets.length > startIdx + limit;
    const nextCursor = hasMore ? (page[page.length - 1]?.id ?? null) : null;

    return NextResponse.json({ 
      bets: page, 
      hasMore, 
      nextCursor, 
      totalCount: allBets.length, 
      propTypes 
    });

  } catch (err: any) {
    console.error('❌ GET Error:', err);
    // Explicitly return JSON even on error to avoid "Unexpected Token <" in frontend
    return NextResponse.json({ error: err.message, bets: [] }, { status: 500 });
  }
}
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;
    
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    const db = adminDb;
    const betRef = db.collection('bettingLog').doc(id);
    const doc = await betRef.get();

    // Prepare shared data for either Single or Parlay
    const formattedData: Record<string, any> = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    // Map fields and ensure correct types for Firebase
    const numFields = ['stake', 'odds', 'week', 'payout', 'profit', 'boost'];
    Object.keys(updates).forEach(key => {
      if (numFields.includes(key) && updates[key] !== undefined) {
        formattedData[key] = Number(updates[key]);
      } else if (key === 'status') {
        formattedData[key] = String(updates[key]).toLowerCase();
      }
    });

    // Handle Game Date Conversion
    if (updates.gameDate) {
      const date = new Date(updates.gameDate);
      if (!isNaN(date.getTime())) {
        formattedData.gameDate = admin.firestore.Timestamp.fromDate(date);
      }
    }

    // 1. If it's a Single Bet (The Doc exists directly)
    if (doc.exists) {
      await betRef.update(formattedData);
      return NextResponse.json({ success: true, message: "Updated single bet" });
    } 
    
    // 2. If it's a Parlay (Grouped by parlayid)
    else {
      let parlayLegsQuery = db.collection('bettingLog').where('parlayid', '==', id);
      let snap = await parlayLegsQuery.get();

      if (snap.empty) {
        parlayLegsQuery = db.collection('bettingLog').where('parlayId', '==', id);
        snap = await parlayLegsQuery.get();
      }

      if (snap.empty) return NextResponse.json({ error: "Bet not found" }, { status: 404 });

      const batch = db.batch();
      const currentLegs = (updates.legs || []) as any[];
      
      // Update every leg in the parlay with the global info (week, date, boost)
      // and update specific leg info (line, status)
      snap.docs.forEach((legDoc) => {
        const matchingUpdate = currentLegs.find(l => l.id === legDoc.id);
        
        const finalLegUpdate = {
          ...formattedData,
          ...(matchingUpdate && {
            line: Number(matchingUpdate.line),
            status: matchingUpdate.status,
            selection: matchingUpdate.selection,
            player: matchingUpdate.player,
            prop: matchingUpdate.prop
          })
        };
        
        batch.update(legDoc.ref, finalLegUpdate);
      });

      await batch.commit();
      return NextResponse.json({ success: true, message: "Updated parlay and all legs" });
    }
  } catch (err: any) {
    console.error('❌ PUT Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}