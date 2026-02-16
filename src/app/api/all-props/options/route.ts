import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Return static options for filters
    const options = {
      weeks: Array.from({ length: 22 }, (_, i) => i + 1), // Weeks 1-22
      propTypes: [
        'All Props',
        'Passing Yards',
        'Passing TDs',
        'Rushing Yards',
        'Rushing TDs',
        'Receiving Yards',
        'Receiving TDs',
        'Receptions',
        'Completions',
        'Attempts',
        'Interceptions',
        'Longest Reception',
        'Longest Rush',
        'Longest Completion',
      ],
    };

    return NextResponse.json(options);
  } catch (error: any) {
    console.error('Options API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}