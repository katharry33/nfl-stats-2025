import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

async function findDuplicateLegs(
  legs: { player: string; prop: string; week?: number | null }[]
): Promise<{ leg: typeof legs[0]; matchedDocId: string; matchedPlayer: string; matchedProp: string }[]> {
  const duplicates: { leg: typeof legs[0]; matchedDocId: string; matchedPlayer: string; matchedProp: string }[] = [];
  for (const leg of legs) {
    if (!leg.player || !leg.prop || !leg.week) continue;
    try {
      const snap = await adminDb
        .collection('bettingLog')
        .where('player', '==', leg.player)
        .where('week',   '==', leg.week)
        .limit(20)
        .get();
      for (const doc of snap.docs) {
        const data = doc.data();
        const storedProp = (data.prop ?? '').toLowerCase().trim();
        const incomingProp = leg.prop.toLowerCase().trim();
        if (storedProp === incomingProp) {
          duplicates.push({ leg, matchedDocId: doc.id, matchedPlayer: data.player ?? leg.player, matchedProp: data.prop ?? leg.prop });
          break;
        }
      }
    } catch (e) {
      console.warn(`⚠️ Duplicate check skipped for ${leg.player}:`, (e as any).message);
    }
  }
  return duplicates;
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const force = searchParams.get('force') === 'true';
    const body = await request.json();
    const { stake = 0, legs = [], odds = 0, payout = 0, profit = 0, userId = 'anonymous', week = null, gameDate = null, boost = 0, isBonusBet = false, status = 'pending', type = 'Parlay' } = body;

    if (!force) {
      const duplicates = await findDuplicateLegs(legs.map((l: any) => ({ player: l.player || l.Player || '', prop: l.prop || l.Prop || '', week: Number(l.week ?? week) || null })));
      if (duplicates.length > 0) {
        return NextResponse.json({ error: 'duplicate', message: `${duplicates.length} leg(s) already exist in your Betting Log for this week.`, duplicates: duplicates.map(d => ({ player: d.matchedPlayer, prop: d.matchedProp, docId: d.matchedDocId })) }, { status: 409 });
      }
    }

    const parlayId = body.parlayId || adminDb.collection('bettingLog').doc().id;
    const batch = adminDb.batch();
    let finalTimestamp = FieldValue.serverTimestamp();
    if (gameDate) {
      const d = new Date(gameDate);
      if (!isNaN(d.getTime())) {
        finalTimestamp = admin.firestore.Timestamp.fromDate(d) as any;
      }
    }

    const parlayData = { parlayId, userId, stake: Number(stake), odds: Number(odds), boost: Number(boost), payout: Number(payout), profit: Number(profit), isBonusBet: Boolean(isBonusBet), week: Number(week), gameDate: finalTimestamp, status, type, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() };

    for (const leg of legs as any[]) {
      const legRef = adminDb.collection('bettingLog').doc();
      batch.set(legRef, { ...parlayData, player: String(leg.player || 'N/A').trim(), prop: String(leg.prop || 'N/A').trim(), line: Number(leg.line) || 0, odds: Number(leg.odds) || 0, selection: leg.selection || 'Over', matchup: leg.matchup || 'N/A', team: leg.team || '', status: leg.status || 'pending', isLive: leg.isLive || false });
    }

    await batch.commit();
    return NextResponse.json({ success: true, id: parlayId });

  } catch (error: any) {
    console.error('❌ save-parlay POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, legs: clientLegs, ...parlayUpdates } = body;
    if (!id) {
      return NextResponse.json({ error: "An ID is required to update a bet." }, { status: 400 });
    }

    const db = adminDb;
    const batch = db.batch();
    let snap = await db.collection('bettingLog').where('parlayId', '==', id).get();
    if (snap.empty) snap = await db.collection('bettingLog').where('parlayid', '==', id).get();

    if (snap.empty) {
      const singleBetRef = db.collection('bettingLog').doc(id);
      const singleBetSnap = await singleBetRef.get();
      if(singleBetSnap.exists) {
        batch.update(singleBetRef, { ...body, updatedAt: FieldValue.serverTimestamp() });
        await batch.commit();
        return NextResponse.json({ success: true, id });
      }
      return NextResponse.json({ error: "Bet not found." }, { status: 404 });
    }

    const sharedUpdates: Record<string, any> = { ...parlayUpdates, updatedAt: FieldValue.serverTimestamp() };
    if (sharedUpdates.gameDate) {
      const d = new Date(sharedUpdates.gameDate);
      if (!isNaN(d.getTime())) {
        sharedUpdates.gameDate = admin.firestore.Timestamp.fromDate(d);
      } else {
        delete sharedUpdates.gameDate;
      }
    }

    snap.docs.forEach(doc => {
      const updatesForThisLeg = { ...sharedUpdates };
      const matchingClientLeg = (clientLegs || []).find((l: any) => l.id === doc.id);
      if (matchingClientLeg) {
        updatesForThisLeg.player = matchingClientLeg.player;
        updatesForThisLeg.prop = matchingClientLeg.prop;
        updatesForThisLeg.line = Number(matchingClientLeg.line);
        updatesForThisLeg.odds = Number(matchingClientLeg.odds);
        updatesForThisLeg.selection = matchingClientLeg.selection;
        updatesForThisLeg.isLive = matchingClientLeg.isLive;

        if (sharedUpdates.status === 'pending') {
          updatesForThisLeg.status = matchingClientLeg.status;
        } else {
          updatesForThisLeg.status = sharedUpdates.status;
        }
      }
      batch.update(doc.ref, updatesForThisLeg);
    });

    await batch.commit();
    return NextResponse.json({ success: true, id, message: "Parlay updated successfully." });

  } catch (error: any) {
    console.error('❌ save-parlay PUT error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
