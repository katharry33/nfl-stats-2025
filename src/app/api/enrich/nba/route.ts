import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

const THE_ODDS_API_KEY = process.env.THE_ODDS_API_KEY;
const REGION = 'us'; 
const MARKETS = 'player_points,player_rebounds,player_assists,player_threes,player_points_rebounds_assists'; 

export async function GET(req: NextRequest) {
  try {
    // 1. Load the ID Map into memory once per request to save Firestore reads
    const idMapSnap = await adminDb.collection('static_nbaIdMap').get();
    const idLookup: Record<string, number> = {};
    idMapSnap.docs.forEach(doc => {
      // Normalizing keys to lowercase for foolproof matching
      idLookup[doc.id.toLowerCase()] = doc.data().bdlId;
    });

    // 2. Fetch upcoming NBA games
    const eventsRes = await fetch(
      `https://api.the-odds-api.com/v4/sports/basketball_nba/events?apiKey=${THE_ODDS_API_KEY}`
    );
    const events = await eventsRes.json();

    const batch = adminDb.batch();
    let count = 0;

    // 3. Process Props
    for (const event of events.slice(0, 8)) { 
      const propsRes = await fetch(
        `https://api.the-odds-api.com/v4/sports/basketball_nba/events/${event.id}/odds?apiKey=${THE_ODDS_API_KEY}&regions=${REGION}&markets=${MARKETS}&oddsFormat=american`
      );
      const data = await propsRes.json();

      if (!data.bookmakers) continue;

      data.bookmakers.forEach((book: any) => {
        book.markets.forEach((market: any) => {
          market.outcomes.forEach((outcome: any) => {
            const playerName = outcome.description;
            const propType = market.key.replace('player_', ''); 
            
            // Look up the BDL ID
            const bdlId = idLookup[playerName.toLowerCase()] || null;

            const docId = `nba-${playerName}-${propType}-${outcome.point}`.toLowerCase().replace(/\s+/g, '-');
            const ref = adminDb.collection('nbaProps_2025').doc(docId);

            batch.set(ref, {
              player: playerName,
              bdlId: bdlId, // <--- CRITICAL: For the Sync/Grader route
              team: playerName === event.home_team ? event.home_team : event.away_team, 
              matchup: `${event.away_team} @ ${event.home_team}`,
              prop: propType,
              line: outcome.point,
              odds: outcome.price,
              bestBook: book.title,
              gameDate: event.commence_time,
              league: 'nba',
              updatedAt: new Date().toISOString()
            }, { merge: true });
            count++;
          });
        });
      });
    }

    await batch.commit();
    return NextResponse.json({ 
      success: true, 
      propsEnriched: count,
      unmappedPlayers: count > 0 ? "Check logs if bdlId is missing" : 0 
    });

  } catch (error: any) {
    console.error("NBA Enrich Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}