import { db } from '@/lib/firebase/admin';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  // New Parameter: league (defaults to nfl for backward compatibility)
  const league          = searchParams.get('league') || 'nfl';
  const weekParam       = searchParams.get('week');
  const seasonParam     = searchParams.get('season');
  const collectionParam = searchParams.get('collection') ?? 'all';
  const limit           = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200);
  const cursor          = searchParams.get('cursor') ?? searchParams.get('lastId') ?? null;

  // Determine collection based on league and season
  const season = seasonParam ? parseInt(seasonParam, 10) : 2025;
  
  // Logical Branching for Collection Names
  let colName: string;
  if (league === 'nba') {
    colName = `nbaProps_${season}`;
  } else {
    colName = collectionParam === 'weekly' 
      ? `weeklyProps_${season}` 
      : `allProps_${season}`;
  }

  try {
    let query: FirebaseFirestore.Query = db.collection(colName);

    // Week Filter (Common for NFL, use sparingly for NBA)
    if (weekParam) {
      const week = parseInt(weekParam, 10);
      if (!isNaN(week)) query = query.where('week', '==', week);
    }

    // Dynamic Sorting: NBA usually sorts by Date, NFL by Week
    if (league === 'nba') {
      query = query.orderBy('gameDate', 'desc').orderBy('__name__', 'desc');
    } else {
      query = query.orderBy('week', 'desc').orderBy('__name__', 'desc');
    }

    query = query.limit(limit + 1);

    // Cursor-based pagination
    if (cursor) {
      const cursorDoc = await db.collection(colName).doc(cursor).get();
      if (cursorDoc.exists) query = query.startAfter(cursorDoc);
    }

    let snapshot = await query.get();

    // Fallback for old Sheets imports (Capitalized "Week")
    if (snapshot.empty && weekParam && league === 'nfl') {
      const week = parseInt(weekParam, 10);
      snapshot = await db.collection(colName)
        .where('Week', '==', week)
        .orderBy('__name__', 'desc')
        .limit(limit + 1)
        .get();
    }

    const docs = snapshot.docs;
    const hasMore = docs.length > limit;
    const page = hasMore ? docs.slice(0, limit) : docs;

    const props = page.map(doc => {
      const d = doc.data() as Record<string, any>;
      const pick = (...keys: string[]) => { 
        for (const k of keys) { 
          if (d[k] != null && d[k] !== '') return d[k]; 
        } 
        return undefined; 
      };

      return {
        id: doc.id,
        league, // Attach league to each prop object
        ...d,
        // Normalized Fields
        player:            pick('player', 'Player'),
        prop:              pick('prop', 'Prop'),
        line:              pick('line', 'Line'),
        matchup:           pick('matchup', 'Matchup'),
        team:              pick('team', 'Team'),
        week:              pick('week', 'Week'),
        season:            pick('season', 'Season'),
        overUnder:         pick('overUnder', 'over under', 'overunder', 'Over/Under', 'Over/Under?'),
        
        // Analytics & Enrichment
        playerAvg:         (() => { 
          for (const k of ['playerAvg', 'player avg', 'Player Avg']) { 
            const v = d[k]; if (v != null && v !== '' && v !== 0) return v; 
          } 
          return d['playerAvg'] ?? d['player avg'] ?? d['Player Avg']; 
        })(),
        opponentRank:      pick('opponentRank', 'opponent rank', 'Opponent Rank'),
        opponentAvgVsStat: pick('opponentAvgVsStat', 'opponent avg vs stat', 'Opponent Avg vs Stat'),
        scoreDiff:         pick('scoreDiff', 'prop.scoreDiff'),
        seasonHitPct:      pick('seasonHitPct', 'prop.seasonHitPct%', 'hit %'),
        confidenceScore:   pick('confidenceScore', 'confidence score', 'Confidence Score'),
        edgeEV:            pick('edgeEV', 'edge ev', 'Edge EV', 'edge/ev'),
        winProbability:    pick('winProbability', 'win probability', 'Win Probability'),
        projWinPct:        pick('projWinPct', 'proj win %', 'Proj Win %'),
        kellyFraction:     pick('kellyFraction', 'kelly fraction', 'Kelly Fraction'),
        bestOdds:          pick('bestOdds', 'best odds', 'Best Odds'),
        
        // Game Metadata
        gameStat:          pick('gameStat', 'game stats', 'game stat'),
        actualResult:      pick('actualResult', 'actual stats', 'actual result'),
        gameDate:          pick('gameDate', 'game date', 'Game Date'),
      };
    });

    const nextCursor = hasMore ? page[page.length - 1]?.id : null;

    const propTypes = [...new Set(props.map((p: any) =>
      p.prop ?? p.Prop ?? ''
    ).filter(Boolean))].sort() as string[];

    return NextResponse.json({
      props,
      propTypes,
      hasMore,
      cursor:     nextCursor,
      lastId:     nextCursor,
      totalCount: props.length,
    });

  } catch (error: any) {
    console.error('GET /api/all-props:', error);
    return NextResponse.json({ error: 'Failed to fetch props' }, { status: 500 });
  }
}

// POST — save manual prop
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const league = body.league || 'nfl';
    const season = body.season ?? 2025;
    
    // Choose collection based on league
    const colPrefix = league === 'nba' ? 'nbaProps' : 'allProps';
    const colName = `${colPrefix}_${season}`;
    
    const ref = db.collection(colName).doc();
    await ref.set({ 
      ...body, 
      league, // Ensure league is persisted
      createdAt: new Date().toISOString() 
    });
    
    return NextResponse.json({ id: ref.id, ok: true });
  } catch (err: any) {
    console.error('POST /api/all-props:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}