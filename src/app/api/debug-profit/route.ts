// src/app/api/debug-profit/route.ts
// Temporary diagnostic — shows exactly which bets are contributing most to profit
// Visit /api/debug-profit to see a breakdown. Delete after fixing.

import { db } from '@/lib/firebase/admin';
import { NextResponse } from 'next/server';

function toDecimal(american: number): number {
  if (!american || !isFinite(american)) return 1;
  return american > 0 ? american / 100 + 1 : 100 / Math.abs(american) + 1;
}

export async function GET() {
  const snap = await db.collection('bettingLog').get();

  const rows = snap.docs.map(d => {
    const r = d.data();
    const stake       = Number(r.stake ?? r.wager ?? 0);
    const odds        = Number(r.odds ?? 0);
    const status      = (r.status ?? '').toLowerCase();
    const payout      = Number(r.payout ?? 0);
    const potential   = Number(r.potentialPayout ?? 0);
    const cashOut     = Number(r.cashOutAmount ?? 0);
    const isBonusBet  = Boolean(r.isBonusBet);
    const betType     = r.betType ?? r.type ?? 'unknown';
    const legCount    = r.legs?.length ?? 0;

    // What calcRealProfit currently does:
    let currentCalc = 0;
    if (!isBonusBet) {
      if (status === 'lost' || status === 'loss') {
        currentCalc = -stake;
      } else if (status === 'cashed') {
        currentCalc = (cashOut || payout) - stake;
      } else if (status === 'won' || status === 'win') {
        currentCalc = stake * toDecimal(odds) - stake;
      }
    }

    return {
      id:          d.id,
      status,
      betType,
      legCount,
      isBonusBet,
      stake,
      odds,
      payout,
      potential,
      cashOut,
      decimalOdds: toDecimal(odds),
      currentCalc,
      // Raw fields for inspection
      rawOdds:     r.odds,
      rawStake:    r.stake ?? r.wager,
      rawPayout:   r.payout,
      rawCashOut:  r.cashOutAmount,
    };
  });

  // Sort by absolute profit contribution — biggest inflators first
  rows.sort((a, b) => Math.abs(b.currentCalc) - Math.abs(a.currentCalc));

  const totalCurrentProfit = rows.reduce((s, r) => s + r.currentCalc, 0);
  const top20 = rows.slice(0, 20);

  // Group by status
  const byStatus: Record<string, { count: number; totalCalc: number }> = {};
  for (const r of rows) {
    if (!byStatus[r.status]) byStatus[r.status] = { count: 0, totalCalc: 0 };
    byStatus[r.status].count++;
    byStatus[r.status].totalCalc += r.currentCalc;
  }

  // Group by betType
  const byType: Record<string, { count: number; totalCalc: number }> = {};
  for (const r of rows) {
    const k = r.betType || 'unknown';
    if (!byType[k]) byType[k] = { count: 0, totalCalc: 0 };
    byType[k].count++;
    byType[k].totalCalc += r.currentCalc;
  }

  return NextResponse.json({
    summary: {
      totalBets:          rows.length,
      totalCurrentProfit: totalCurrentProfit.toFixed(2),
      byStatus,
      byBetType: byType,
    },
    top20Inflators: top20.map(r => ({
      id:         r.id,
      status:     r.status,
      betType:    r.betType,
      legCount:   r.legCount,
      isBonusBet: r.isBonusBet,
      stake:      r.stake,
      odds:       r.odds,
      decimalOdds: r.decimalOdds.toFixed(3),
      payout:     r.payout,
      cashOut:    r.cashOut,
      profit:     r.currentCalc.toFixed(2),
      // Flag suspicious values
      flags: [
        r.decimalOdds > 50    && '⚠️ odds > 50x (very high parlay?)',
        r.currentCalc > 1000  && '🚨 profit > $1000',
        r.currentCalc < -1000 && '🚨 loss > $1000',
        r.status === 'cashed' && r.payout > 100 && '⚠️ cashed with large payout field',
        r.stake === 0         && '⚠️ zero stake',
      ].filter(Boolean),
    })),
  }, { status: 200 });
}