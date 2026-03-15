// src/app/api/performance/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function toIso(v: any): string | null {
  if (!v) return null;
  if (typeof v === 'string') return v;
  if (v?.toDate) return v.toDate().toISOString();
  return null;
}

function normalizeTimestamps(data: Record<string, any>): Record<string, any> {
  const out = { ...data };
  for (const k of ['createdAt', 'updatedAt', '_updatedat', 'date', 'gameDate']) {
    if (out[k]) out[k] = toIso(out[k]) ?? out[k];
  }
  // Recurse into legs
  if (Array.isArray(out.legs)) {
    out.legs = out.legs.map((l: any) => {
      const leg = { ...l };
      for (const k of ['createdAt', 'updatedAt', 'date', 'gameDate']) {
        if (leg[k]) leg[k] = toIso(leg[k]) ?? leg[k];
      }
      return leg;
    });
  }
  return out;
}

export async function GET() {
  try {
    const snap = await db
      .collection('bettingLog')
      .orderBy('createdAt', 'desc')
      .get();

    const bets = snap.docs.map(d => {
      const raw  = d.data() as Record<string, any>;
      const data = normalizeTimestamps(raw);

      // Normalise leg structure — single bets get wrapped so consumers
      // can always loop over .legs uniformly
      const legs: any[] = data.legs?.length
        ? data.legs
        : [{
            player:    data.player    ?? 'Unknown',
            prop:      data.prop      ?? data.description ?? 'Other',
            line:      data.line      ?? null,
            odds:      data.odds      ?? null,
            selection: data.selection ?? data.overUnder ?? null,
            status:    data.status    ?? null,
          }];

      return {
        id:             d.id,
        ...data,
        stake:          Number(data.stake  || data.wager  || 0),
        odds:           Number(data.odds   || 0),
        potentialPayout: Number(data.potentialPayout || data.payout || 0),
        cashOutAmount:  Number(data.cashOutAmount || 0),
        legs,
      };
    });

    return NextResponse.json(bets);
  } catch (err: any) {
    console.error('Performance API Error:', err);
    return NextResponse.json({ error: err.message ?? 'Failed to fetch bets' }, { status: 500 });
  }
}