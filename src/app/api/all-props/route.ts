import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const collectionName = 'allProps_2025';

    // Pagination parameters
    const limitParam = searchParams.get('limit');
    const lastVisibleId = searchParams.get('lastVisible');
    const limit = limitParam ? parseInt(limitParam, 10) : 100;

    // Filter parameters
    const weekParam = searchParams.get('week');
    const teamParam = searchParams.get('team');
    const playerParam = searchParams.get('player');
    const propParam = searchParams.get('prop');
    const gamedateParam = searchParams.get('gamedate');
    const matchupParam = searchParams.get('matchup');

    const useUppercase = true; // Assume uppercase fields for simplicity
    const playerField = useUppercase ? 'Player' : 'player';

    let query = adminDb.collection(collectionName).orderBy(playerField) as FirebaseFirestore.Query;

    if (weekParam && weekParam !== 'all') {
      const weekField = useUppercase ? 'Week' : 'week';
      query = query.where(weekField, '==', Number(weekParam));
    }

    if (lastVisibleId) {
      const lastVisibleDoc = await adminDb.collection(collectionName).doc(lastVisibleId).get();
      if (lastVisibleDoc.exists) {
        query = query.startAfter(lastVisibleDoc);
      }
    }

    const snapshot = await query.limit(limit).get();

    let props = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        Player: data.Player || data.player || 'Unknown',
        Team: data.Team || data.team || 'N/A',
        Prop: data.Prop || data.prop || '',
        Line: data.Line !== undefined ? data.Line : (data.line || 0),
        Odds: data.Odds || data.odds || -110,
        Week: data.Week !== undefined ? data.Week : (data.week || 0),
        Matchup: data.Matchup || data.matchup || '',
        GameDate: data['Game Date'] || data.gamedate || data.GameDate || '',
        player: data.Player || data.player || 'Unknown',
        team: data.Team || data.team || 'N/A',
        prop: data.Prop || data.prop || '',
        line: data.Line !== undefined ? data.Line : (data.line || 0),
        odds: data.Odds || data.odds || -110,
        week: data.Week !== undefined ? data.Week : (data.week || 0),
        matchup: data.Matchup || data.matchup || '',
        gameDate: data['Game Date'] || data.gamedate || data.GameDate || '',
      };
    });

    if (teamParam) {
      const teamLower = teamParam.toLowerCase();
      props = props.filter(p => 
        (p.Team || p.team || '').toLowerCase().includes(teamLower)
      );
    }

    if (playerParam) {
      const playerLower = playerParam.toLowerCase();
      props = props.filter(p => 
        (p.Player || p.player || '').toLowerCase().includes(playerLower)
      );
    }

    if (propParam && propParam !== 'all') {
      props = props.filter(p => 
        (p.Prop || p.prop || '').toLowerCase().includes(propParam.toLowerCase())
      );
    }

    if (gamedateParam) {
      props = props.filter(p => 
        (p.GameDate || p.gameDate || '').includes(gamedateParam)
      );
    }

    if (matchupParam) {
      const matchupLower = matchupParam.toLowerCase();
      props = props.filter(p => 
        (p.Matchup || p.matchup || '').toLowerCase().includes(matchupLower)
      );
    }

    const lastDoc = snapshot.docs[snapshot.docs.length - 1];
    const newLastVisibleId = lastDoc ? lastDoc.id : null;

    return NextResponse.json({ props, lastVisibleId: newLastVisibleId });
  } catch (error: any) {
    console.error('All-props API error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch props' }, { status: 500 });
  }
}