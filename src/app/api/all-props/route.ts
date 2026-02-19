import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    
    const weekParam = searchParams.get('week');
    const teamParam = searchParams.get('team');
    const playerParam = searchParams.get('player');
    const propParam = searchParams.get('prop');
    const gamedateParam = searchParams.get('gamedate');
    const matchupParam = searchParams.get('matchup');

    console.log('--- New API Request (In-Memory Filter) ---');
    console.log('🔍 Search Params:', { weekParam, teamParam, playerParam, propParam, gamedateParam, matchupParam });

    const collectionName = 'allProps_2025';
    const query = adminDb.collection(collectionName);
    
    // 1. Fetch ALL data first
    const snapshot = await query.get();
    console.log(`Fetched ${snapshot.size} total documents from ${collectionName}.`);

    // 2. Normalize and Filter in Memory
    let props = snapshot.docs.map((doc: any) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        // Create standardized, lowercase fields for reliable filtering
        normalizedWeek: data.Week !== undefined ? data.Week : data.week,
        player: (data.Player || data.player || '').toLowerCase(),
        team: (data.Team || data.team || '').toLowerCase(),
        prop: (data.Prop || data.prop || '').toLowerCase(),
        matchup: (data.Matchup || data.matchup || '').toLowerCase(),
        gameDate: data['Game Date'] || data.gamedate || data.GameDate || '',
      };
    });
    
    console.log(`Normalized ${props.length} documents.`);

    // 3. Apply filters manually on the normalized data
    
    // Week Filter
    if (weekParam && weekParam !== 'all') {
      const targetWeek = parseInt(weekParam, 10);
      if (!isNaN(targetWeek)) {
        props = props.filter(p => p.normalizedWeek === targetWeek);
        console.log(`After week filter (${targetWeek}): ${props.length} props remaining.`);
      }
    }

    // Team Filter
    if (teamParam) {
      const searchTeam = teamParam.toLowerCase();
      props = props.filter(p => p.team.includes(searchTeam));
      console.log(`After team filter ("${searchTeam}"): ${props.length} props remaining.`);
    }

    // Player Filter
    if (playerParam) {
      const searchPlayer = playerParam.toLowerCase();
      props = props.filter(p => p.player.includes(searchPlayer));
      console.log(`After player filter ("${searchPlayer}"): ${props.length} props remaining.`);
    }

    // Prop Type Filter
    if (propParam && propParam !== 'All Props') {
        const searchProp = propParam.toLowerCase();
        props = props.filter(p => p.prop.includes(searchProp));
        console.log(`After prop filter ("${searchProp}"): ${props.length} props remaining.`);
    }

    // Game Date Filter
    if (gamedateParam) {
        props = props.filter(p => p.gameDate.includes(gamedateParam));
        console.log(`After gamedate filter: ${props.length} props remaining.`);
    }

    // Matchup Filter
    if (matchupParam) {
        const searchMatchup = matchupParam.toLowerCase();
        props = props.filter(p => p.matchup.includes(searchMatchup));
        console.log(`After matchup filter: ${props.length} props remaining.`);
    }

    console.log(`✅ Final result: ${props.length} props after all filters.`);

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