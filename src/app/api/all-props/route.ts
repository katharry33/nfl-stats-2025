import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const weekParam = searchParams.get('week');
    const teamParam = searchParams.get('team');
    const playerParam = searchParams.get('player');
    const propParam = searchParams.get('prop');
    const gamedateParam = searchParams.get('gamedate');
    const matchupParam = searchParams.get('matchup');
    
    console.log('All-props filters:', { weekParam, teamParam, playerParam, propParam, gamedateParam, matchupParam });

    const collectionName = 'allProps_2025';
    let query: any = adminDb.collection(collectionName);

    if (weekParam && weekParam !== 'all') {
      const weekNumber = parseInt(weekParam, 10);
      if (!isNaN(weekNumber)) {
        query = query.where('Week', '==', weekNumber);
        console.log(`Filtering: Week == ${weekNumber} (number)`);
      } else {
        console.warn(`Invalid week number: ${weekParam}`);
      }
    }

    if (teamParam) {
      query = query.where('Team', '==', teamParam.toUpperCase());
      console.log(`Filtering: Team == ${teamParam.toUpperCase()}`);
    }

    const snapshot = await query.get();
    console.log(`✅ Query returned: ${snapshot.size} documents for Week ${weekParam || 'all'}`);

    if (snapshot.size === 0) {
      console.warn('⚠️ Zero documents returned! Check:');
      console.warn('  - Collection name:', collectionName);
      console.warn('  - Week filter:', weekParam ? `Week == ${parseInt(weekParam, 10)}` : 'none');
      console.warn('  - Team filter:', teamParam ? `Team == ${teamParam.toUpperCase()}` : 'none');
    }

    let props = snapshot.docs.map((doc: any) => {
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

    if (playerParam) {
      const playerLower = playerParam.toLowerCase();
      props = props.filter((p: any) => 
        (p.Player || p.player || '').toLowerCase().includes(playerLower)
      );
    }

    if (propParam && propParam !== 'All Props') {
      props = props.filter((p: any) => 
        (p.Prop || p.prop || '').toLowerCase().includes(propParam.toLowerCase())
      );
    }

    if (gamedateParam) {
      props = props.filter((p: any) => 
        (p.GameDate || p.gameDate || '').includes(gamedateParam)
      );
    }

    if (matchupParam) {
      const matchupLower = matchupParam.toLowerCase();
      props = props.filter((p: any) => 
        (p.Matchup || p.matchup || '').toLowerCase().includes(matchupLower)
      );
    }

    console.log(`✅ Final result: ${props.length} props after filters`);

    return NextResponse.json(props, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });
  } catch (error: any) {
    console.error('All-props API error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch props' }, { status: 500 });
  }
}