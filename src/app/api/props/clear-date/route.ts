import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

function colName(league: string, season: number) {
  if (league === "nba") return `nbaProps_${season}`;
  if (league === "nfl" && season === 2024) return "allProps"; // legacy
  return `nflProps_${season}`;
}

function normalizePropKey(prop: string) {
  return prop.toLowerCase().replace(/[^a-z0-9]/g, "_");
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await req.json();

    const { league, season } = body;
    if (!league || !season) {
      return NextResponse.json({ error: "league and season required" }, { status: 400 });
    }

    const update: Record<string, any> = {
      updatedAt: new Date().toISOString(),
    };

    const allowed = [
      "player",
      "team",
      "opponent",
      "prop",
      "line",
      "odds",
      "overUnder",
      "gameDate",
    ];

    for (const key of allowed) {
      if (key in body) update[key] = body[key];
    }

    if (update.prop) update.propNorm = normalizePropKey(update.prop);
    if (update.line != null) update.line = Number(update.line);
    if (update.odds != null) update.odds = Number(update.odds);
    if (update.overUnder) update.overUnder = update.overUnder.toLowerCase();

    const ref = adminDb.collection(colName(league, Number(season))).doc(id);
    await ref.update(update);

    return NextResponse.json({ success: true, id });
  } catch (err) {
    console.error("[/api/props/:id] Error:", err);
    return NextResponse.json({ error: "Failed to update prop" }, { status: 500 });
  }
}
