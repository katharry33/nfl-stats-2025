import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Always use allProps_2025 collection
    const collectionName = 'allProps_2025';
    
    // Get filter parameters
    const weekParam = searchParams.get('week');
    const teamParam = searchParams.get('team');
    const playerParam = searchParams.get('player');
    const propParam = searchParams.get('prop');
    const gamedateParam = searchParams.get('gamedate');
    
    console.log('All-props filters:', { weekParam, teamParam, playerParam, propParam, gamedateParam });

    // Test both uppercase and lowercase field names
    const testLower = await adminDb.collection(collectionName)
      .where('week', '==', weekParam ? Number(weekParam) : 1)
      .limit(5)
      .get();

    const testUpper = await adminDb.collection(collectionName)
      .where('Week', '==', weekParam ? Number(weekParam) : 1)
      .limit(5)
      .get();

    const useUppercase = testUpper.size > 0;
    console.log(`Test lowercase 'week': ${testLower.size} docs`);
    console.log(`Test uppercase 'Week': ${testUpper.size} docs`);
    console.log(`✓ Using ${useUppercase ? 'uppercase' : 'lowercase'} fields`);

    // Build query with appropriate field names
    let query = adminDb.collection(collectionName);

    // Week filter (required)
    if (weekParam && weekParam !== 'all') {
      const weekNum = Number(weekParam);
      const weekField = useUppercase ? 'Week' : 'week';
      query = query.where(weekField, '==', weekNum) as any;
      console.log(`Filtering: ${weekField} == ${weekNum}`);
    }

    // Team filter (exact match, case-insensitive handled in client)
    if (teamParam) {
      const teamField = useUppercase ? 'Team' : 'team';
      query = query.where(teamField, '==', teamParam.toUpperCase()) as any;
      console.log(`Filtering: ${teamField} == ${teamParam.toUpperCase()}`);
    }

    // Execute query
    const snapshot = await query.limit(500).get();
    console.log(`✅ Query returned: ${snapshot.size} documents`);

    let props = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        // Return both cases for compatibility
        Player: data.Player || data.player || 'Unknown',
        Team: data.Team || data.team || 'N/A',
        Prop: data.Prop || data.prop || '',
        Line: data.Line !== undefined ? data.Line : (data.line || 0),
        Odds: data.Odds || data.odds || -110,
        Week: data.Week !== undefined ? data.Week : (data.week || 0),
        Matchup: data.Matchup || data.matchup || '',
        GameDate: data['Game Date'] || data.gamedate || data.GameDate || '',
        // Lowercase versions for consistency
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

    // Client-side filters (player, prop, gamedate)
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

    console.log(`✅ Final result: ${props.length} props after filters`);

    return NextResponse.json(props);
  } catch (error: any) {
    console.error('All-props API error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch props' }, { status: 500 });
  }
}