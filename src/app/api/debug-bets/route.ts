// src/app/api/debug-bets/route.ts
// TEMPORARY — delete after diagnosis
import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId') ?? '';

  const col = adminDb.collection('bettingLog');

  // Count everything
  const allSnap = await col.limit(1000).get();
  const allDocs = allSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  // Categorize each doc
  const stats = {
    total: allDocs.length,
    hasUserId:       allDocs.filter((d: any) => d.userId).length,
    matchesUserId:   allDocs.filter((d: any) => d.userId === userId).length,
    hasNoUserId:     allDocs.filter((d: any) => !d.userId).length,
    hasParlayId:     allDocs.filter((d: any) => d.parlayId).length,
    hasParlayidLower: allDocs.filter((d: any) => d.parlayid).length,
    hasEitherParlay: allDocs.filter((d: any) => d.parlayId || d.parlayid).length,
    hasNeitherParlay: allDocs.filter((d: any) => !d.parlayId && !d.parlayid).length,
    hasBothUserIdAndParlayid: allDocs.filter((d: any) => (d.userId === userId) && (d.parlayId || d.parlayid)).length,
  };

  // Sample of docs with no parlayId and no userId (orphans)
  const orphans = allDocs
    .filter((d: any) => !d.parlayId && !d.parlayid && !d.userId)
    .slice(0, 5)
    .map((d: any) => ({
      id: d.id,
      fields: Object.keys(d),
      parlayId: d.parlayId,
      parlayid: d.parlayid,
      userId: d.userId,
      stake: d.stake,
      wager: d.wager,
      createdAt: d.createdAt,
    }));

  // Sample of docs that match userId but also have parlayid (would be skipped in GET)
  const userIdWithParlay = allDocs
    .filter((d: any) => d.userId === userId && (d.parlayId || d.parlayid))
    .slice(0, 5)
    .map((d: any) => ({
      id: d.id,
      userId: d.userId,
      parlayId: d.parlayId,
      parlayid: d.parlayid,
      stake: d.stake,
      wager: d.wager,
    }));

  // Unique parlayIds across all docs
  const parlayIds = new Set<string>();
  allDocs.forEach((d: any) => {
    const pid = d.parlayId ?? d.parlayid;
    if (pid) parlayIds.add(pid);
  });

  // Check for parlayIds that only have 1 leg doc (might explain missing parlays)
  const parlayLegCounts: Record<string, number> = {};
  allDocs.forEach((d: any) => {
    const pid = d.parlayId ?? d.parlayid;
    if (pid) parlayLegCounts[pid] = (parlayLegCounts[pid] ?? 0) + 1;
  });
  const singleLegParlays = Object.entries(parlayLegCounts)
    .filter(([_, count]) => count === 1)
    .map(([id]) => id)
    .slice(0, 10);

  return NextResponse.json({
    stats,
    orphans,
    userIdWithParlay,
    uniqueParlayIds: parlayIds.size,
    singleLegParlays,
    parlayLegCounts: Object.fromEntries(
      Object.entries(parlayLegCounts).slice(0, 20)
    ),
  });
}