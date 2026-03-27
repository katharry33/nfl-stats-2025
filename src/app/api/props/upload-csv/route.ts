import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

function normalizePropKey(prop: string) {
  return prop.toLowerCase().replace(/[^a-z0-9]/g, "_");
}

function colName(league: string, season: number) {
  if (league === "nba") return `nbaProps_${season}`;
  if (league === "nfl" && season === 2024) return "allProps";
  return `nflProps_${season}`;
}

export async function POST(req: NextRequest) {
  try {
    const { props, league, date, season } = await req.json();

    const collection = colName(league, Number(season));
    const batch = adminDb.batch();
    const now = new Date().toISOString();

    props.forEach((p: any) => {
      const player = p.Player;
      const prop = p.Prop;
      const line = Number(p.Line);
      const odds = p.Odds != null ? Number(p.Odds) : null;

      const id = `${player}-${prop}-${line}-${date}`
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "-");

      const ref = adminDb.collection(collection).doc(id);

      batch.set(
        ref,
        {
          player,
          team: p.Team ?? "",
          opponent: p.Opponent ?? "",
          prop,
          propNorm: normalizePropKey(prop),
          line,
          overUnder: (p.OverUnder ?? "over").toLowerCase(),
          odds,
          gameDate: date,
          season: Number(season),
          league,
          source: "csv",
          rowHash: `${player}-${prop}-${line}-${date}`,
          createdAt: now,
          updatedAt: now,
        },
        { merge: true }
      );
    });

    await batch.commit();

    return NextResponse.json({ success: true, count: props.length });
  } catch (err) {
    console.error("[upload-csv] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
