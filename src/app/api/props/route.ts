import { adminDb } from '@/lib/firebase/admin';
import { QueryDocumentSnapshot } from 'firebase-admin/firestore';
import * as admin from 'firebase-admin';

function decodeCursor(cursor?: string) {
  if (!cursor) return null;
  try {
    return Buffer.from(cursor, 'base64').toString('utf8');
  } catch {
    return null;
  }
}
function encodeCursor(id: string) {
  return Buffer.from(id, 'utf8').toString('base64');
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    // Basic params and validation
    const league = (searchParams.get('league') || 'nba').toLowerCase();
    const seasonParam = searchParams.get('season');
    const seasonValue = seasonParam ? Number(seasonParam) : 2025;
    const date = searchParams.get('date'); // exact match expected
    const weekParam = searchParams.get('week');
    const week = weekParam ? Number(weekParam) : undefined;
    const search = (searchParams.get('search') || '').trim();
    const sortBy = searchParams.get('sortBy') || 'line';
    const sortDir = (searchParams.get('sortDir') || 'desc').toLowerCase() === 'asc' ? 'asc' : 'desc';
    const pageSizeParam = Number(searchParams.get('pageSize') || '50');
    const maxPageSize = 200;
    const pageSize = Math.min(Math.max(1, pageSizeParam || 50), maxPageSize);
    const cursor = decodeCursor(searchParams.get('cursor') || undefined);
    const columnsParam = searchParams.get('columns'); // comma separated
    const columns = columnsParam ? columnsParam.split(',').map(c => c.trim()).filter(Boolean) : null;
    const includeCount = searchParams.get('count') === 'true';

    // Choose collection naming strategy
    // Prefer season-specific collections for performance; fallback to a generic collection if needed
    const collectionPath = league === 'nba' ? `nbaProps_${seasonValue}` : `nflProps_${seasonValue}`;
    let collectionRef: admin.firestore.CollectionReference = adminDb.collection(collectionPath);

    // Build query
    let query: admin.firestore.Query = collectionRef;

    // Date filter (exact)
    if (date && date !== 'All') {
      // Ensure your ingest uses the same key (date or gameDate). Adjust if necessary.
      query = query.where('date', '==', date);
    }

    // League-specific filters
    if (league === 'nfl') {
      query = query.where('season', '==', seasonValue);
      if (week && !Number.isNaN(week)) {
        query = query.where('week', '==', week);
      }
    } else {
      // For NBA we still enforce season if you store it
      query = query.where('season', '==', seasonValue);
    }

    // Simple prefix search on player (Firestore doesn't support OR across fields)
    // For more advanced search use Algolia or Elastic
    if (search) {
      const start = search;
      const end = search + '\uf8ff';
      query = query.where('player', '>=', start).where('player', '<=', end);
    }

    // Sorting
    // Ensure the field you sort by is indexed in Firestore (create composite indexes if needed)
    query = query.orderBy(sortBy, sortDir as admin.firestore.OrderByDirection);

    // Cursor pagination
    if (cursor) {
      // cursor is expected to be a doc id encoded in base64
      const cursorDoc = await collectionRef.doc(cursor).get();
      if (cursorDoc.exists) {
        query = query.startAfter(cursorDoc);
      }
    }

    // Limit
    query = query.limit(pageSize);

    // Execute query
    const snapshot = await query.get();

    // Map docs and optionally project fields
    const docs = snapshot.docs.map((doc: QueryDocumentSnapshot) => {
      const d = doc.data();
      const base = {
        id: doc.id,
        playerName: d.player || d.playerName || 'Unknown',
        propNorm: d.propNorm || d.prop,
        playerAvg: d.playerAvg || d.avg || 0,
        matchup: d.matchup || `${d.team || ''} @ ${d.opponent || ''}`,
        ...d
      };
      if (!columns) return base;
      // project only requested columns plus id
      const projected: any = { id: doc.id };
      for (const c of columns) {
        if (c in base) projected[c] = (base as any)[c];
      }
      return projected;
    });

    // nextCursor: base64 encoded last doc id (or null)
    const lastDoc = snapshot.docs[snapshot.docs.length - 1];
    const nextCursor = lastDoc ? encodeCursor(lastDoc.id) : null;

    // Optional total count (costly for large collections)
    let total: number | null = null;
    if (includeCount) {
      // Firestore count() aggregation is preferred if available in your SDK version
      try {
        // adminDb.collectionGroup or collection().count() depending on SDK
        // Fallback: use a separate lightweight count collection or avoid count for production
        const countQuery = collectionRef; // adjust if you need to apply same filters
        // NOTE: snapshot.size is only the page size, not total. Use aggregation if supported.
        // Here we attempt a count() aggregation if available:
        // @ts-ignore
        if (typeof (collectionRef as any).count === 'function') {
          // @ts-ignore
          const agg = await (collectionRef as any).count().get();
          // @ts-ignore
          total = agg.data().count;
        } else {
          // As a fallback, do not compute total to avoid expensive reads
          total = null;
        }
      } catch (e) {
        total = null;
      }
    }

    return Response.json({
      items: docs,
      nextCursor,
      pageSize,
      total
    });
  } catch (err: any) {
    console.error('GET /api/props error', err);
    return new Response(JSON.stringify({ error: err?.message || 'Internal error' }), { status: 500 });
  }
}
