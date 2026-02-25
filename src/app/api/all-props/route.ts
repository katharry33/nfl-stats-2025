import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

const PAGE_SIZE = 50;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get('cursor');
    const limit  = parseInt(searchParams.get('limit') || String(PAGE_SIZE));
    const year   = searchParams.get('year') || 'all';

    const collectionConfigs: Record<string, { name: string; sortField: string }[]> = {
      '2025': [
        { name: 'allProps_2025', sortField: '_updatedAt' },
        { name: 'bets', sortField: 'createdAt' } // Added the 2025 bets collection
      ],
      '2024': [{ name: 'allProps_2024', sortField: 'createdAt'  }],
      'all':  [
        { name: 'allProps_2025', sortField: '_updatedAt' },
        { name: 'bets',           sortField: 'createdAt'  },
        { name: 'allProps_2024', sortField: 'createdAt'  },
      ],
    };

    const targets = collectionConfigs[year] ?? collectionConfigs['all'];
    let allDocs: any[] = [];

    // Fetch all collections in parallel for better performance
    const snapshots = await Promise.all(
      targets.map(async (target) => {
        try {
          const snap = await adminDb
            .collection(target.name)
            .orderBy(target.sortField, 'desc')
            .limit(200) // Reasonable ceiling for history pages
            .get();
          return { name: target.name, docs: snap.docs };
        } catch (e) {
          console.warn(`⚠️ Ordered fetch failed for ${target.name}, falling back...`);
          const snap = await adminDb.collection(target.name).limit(200).get();
          return { name: target.name, docs: snap.docs };
        }
      })
    );

    for (const { name, docs } of snapshots) {
      const normalized = docs.map(doc => {
        const data = doc.data();
        
        // --- UNIVERSAL NORMALIZATION ---
        // Ensure keys are consistent regardless of collection schema
        return {
          id:          doc.id,
          _collection: name,
          player:      data.player || data.Player || data.playerteam || 'Unknown',
          prop:        data.prop   || data.Prop   || 'N/A',
          line:        data.line   || data.Line   || (data['Over/Under?'] ? `${data['Over/Under?']} ${data.Line}` : ''),
          matchup:     data.matchup|| data.Matchup|| '',
          week:        data.week   || data.Week   || '',
          odds:        data.odds   || data.Odds   || '-110',
          status:      data.status || data.result || data['Actual Result'] || 'pending',
          season:      data.season || (name.includes('2024') ? '2024' : '2025'),
          createdAt:   toISO(data.createdAt || data._updatedAt || data['Game Date']),
        };
      });
      allDocs = allDocs.concat(normalized);
    }

    // Global Sort (In-memory)
    allDocs.sort((a, b) => {
      const da = new Date(a.createdAt || 0).getTime();
      const db = new Date(b.createdAt || 0).getTime();
      return db - da;
    });

    // Cursor Logic
    const startIndex = cursor ? allDocs.findIndex(d => d.id === cursor) + 1 : 0;
    const page = allDocs.slice(startIndex, startIndex + limit);
    const hasMore = allDocs.length > startIndex + limit;
    const nextCursor = hasMore ? page[page.length - 1]?.id : null;

    return NextResponse.json({
      props: page,
      hasMore,
      nextCursor,
      total: page.length,
    });

  } catch (error: any) {
    console.error('❌ all-props fatal error:', error);
    return NextResponse.json({ error: error.message, props: [] }, { status: 500 });
  }
}

// A more robust timestamp conversion
function toISO(val: any): string | null {
  if (!val) return null;
  
  // Standard Firestore Timestamp object
  if (typeof val.toDate === 'function') {
    return val.toDate().toISOString();
  }
  
  // Object with seconds/nanoseconds (e.g., from Admin SDK)
  if (typeof val.seconds === 'number') {
    return new Date(val.seconds * 1000).toISOString();
  }
  
  // Object with _seconds/_nanoseconds (older format)
  if (typeof val._seconds === 'number') {
    return new Date(val._seconds * 1000).toISOString();
  }
  
  // Attempt to parse if it's a string or number
  if (typeof val === 'string' || typeof val === 'number') {
    try {
      const d = new Date(val);
      if (!isNaN(d.getTime())) {
        return d.toISOString();
      }
    } catch (e) {
      // Not a parsable date string/number
    }
  }
  
  return null; // Return null if no conversion is possible
}