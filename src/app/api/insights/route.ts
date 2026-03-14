// src/app/api/insights/route.ts
import { db } from '@/lib/firebase/admin';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const season = 2025; // Or dynamic based on query params
    const colName = `allProps_${season}`;
    
    // 1. Fetch ALL docs from the collection
    // Note: If you reach >10k docs, consider using a 'where' filter for only completed games
    const snapshot = await db.collection(colName)
      .where('actualResult', 'in', ['won', 'lost', 'push']) 
      .get();

    const stats: Record<string, any> = {};

    snapshot.docs.forEach(doc => {
      const data = doc.data();
      const player = data.player || data.Player;
      const propType = data.prop || data.Prop;
      const result = (data.actualResult || data['actual result'] || '').toLowerCase();

      if (!player || !propType || !result) return;

      const key = `${player}|${propType}`;

      if (!stats[key]) {
        stats[key] = {
          player,
          propType,
          won: 0,
          lost: 0,
          push: 0,
          total: 0,
          avgLine: 0,
          lines: []
        };
      }

      stats[key].total += 1;
      stats[key][result] = (stats[key][result] || 0) + 1;
      
      if (data.line || data.Line) {
        stats[key].lines.push(Number(data.line || data.Line));
      }
    });

    // 2. Finalize calculations
    const insights = Object.values(stats)
      .map((s: any) => {
        const hitRate = (s.won / (s.total - s.push)) * 100;
        const avgLine = s.lines.length > 0 
          ? s.lines.reduce((a: number, b: number) => a + b, 0) / s.lines.length 
          : 0;

        return {
          player: s.player,
          prop: s.propType,
          hitRate,
          won: s.won,
          total: s.total,
          avgLine: Math.round(avgLine * 10) / 10
        };
      })
      // Only show high-probability hits or high-sample sizes
      .filter(i => i.total >= 3) 
      .sort((a, b) => b.hitRate - a.hitRate);

    return NextResponse.json({ insights });
  } catch (error) {
    console.error('Insights Error:', error);
    return NextResponse.json({ error: 'Failed to aggregate insights' }, { status: 500 });
  }
}