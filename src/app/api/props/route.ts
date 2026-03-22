import { NextRequest, NextResponse } from 'next/server';
import { adminDb as db } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

/**
 * GET /api/props
 * Query params: league, season, date, enriched, limit, offset
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  // 1. Parameter Extraction & Sanitization
  const league   = (searchParams.get('league') || 'nba').toLowerCase();
  const season   = searchParams.get('season') || '2025';
  const date     = searchParams.get('date'); 
  const enriched = searchParams.get('enriched') === 'true';
  const limit    = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200); // Cap at 200
  const offset   = parseInt(searchParams.get('offset') || '0', 10);

  try {
    const colName = `${league}Props_${season}`;
    const propsCol = db.collection(colName);

    // 2. Initial Existence Check
    // Prevents crashing if the season collection hasn't been created yet
    const collectionSnap = await propsCol.limit(1).get();
    if (collectionSnap.empty && !date) {
      return NextResponse.json([]);
    }

    // 3. Build Firestore Query
    let query: FirebaseFirestore.Query = propsCol;

    // Filter by Date (The most common use case)
    if (date) {
      query = query.where('gameDate', '==', date);
    }

    // Filter by Enrichment status (Only show props with math/scores)
    if (enriched) {
      // We check for confidenceScore existence
      query = query.where('confidenceScore', '!=', null);
    }

    // 4. Sorting Logic
    // Default sort: Highest Edge first. 
    // Note: This requires a composite index in Firebase.
    // If index isn't ready, fallback to 'player' to avoid query failure.
    try {
      if (enriched) {
        query = query.orderBy('confidenceScore', 'desc');
      } else {
        query = query.orderBy('player', 'asc');
      }
    } catch (e) {
      console.warn("Index not ready for sorting, falling back to basic order.");
    }

    // 5. Execution with Pagination
    // For large slates, we use offset. For 1000+ props, consider startAfter().
    const snapshot = await query.offset(offset).limit(limit).get();

    const props = snapshot.docs.map(doc => {
      const data = doc.data();
      
      return {
        id: doc.id,
        ...data,
        // Ensure critical UI fields have defaults
        bestEdgePct: data.bestEdgePct ?? 0,
        expectedValue: data.expectedValue ?? 0,
        confidenceScore: data.confidenceScore ?? null,
        playerAvg: data.playerAvg ?? null,
        // Calculate a 'value status' on the fly if needed
        isHighValue: (data.bestEdgePct || 0) > 0.05, 
      };
    });

    // 6. Return Data + Metadata for the Hook
    return NextResponse.json(props, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30',
      }
    });

  } catch (err: any) {
    console.error(`❌ Props API Error [${league}]:`, err);
    
    // Handle specific Firebase index errors gracefully
    if (err.message?.includes('index')) {
      return NextResponse.json(
        { error: 'Database index building. Please try again in 2 minutes.', url: err.details },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch props', message: err.message },
      { status: 500 }
    );
  }
}