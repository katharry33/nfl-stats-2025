import { NextResponse } from 'next/server';

export async function GET() {
  // Static arrays ensure your UI dropdowns work perfectly without a DB call
  return NextResponse.json({
    weeks: Array.from({ length: 22 }, (_, i) => i + 1),
    props: ["Passing Yards", "Rushing Yards", "Receiving Yards", "Touchdowns", "Receptions"],
    teams: [
      "ARI", "ATL", "BAL", "BUF", "CAR", "CHI", "CIN", "CLE", "DAL", "DEN", 
      "DET", "GB", "HOU", "IND", "JAX", "KC", "LV", "LAC", "LAR", "MIA", 
      "MIN", "NE", "NO", "NYG", "NYJ", "PHI", "PIT", "SF", "SEA", "TB", "TEN", "WAS"
    ]
  });
}