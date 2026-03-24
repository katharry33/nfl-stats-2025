import { NextResponse } from 'next/server';
import { addBet, getBets, deleteBet } from '@/lib/actions/bet-actions';

export async function GET(req: Request) {
  try {
    const allData = await getBets();
    
    // Sort Newest -> Oldest
    const sortedBets = allData.sort((a: any, b: any) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return dateB - dateA;
    });

    return NextResponse.json({ bets: sortedBets });
  } catch (error: any) {
    console.error("GET API ERROR:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const betData = await req.json();
    
    // Pass a dummy or empty string for userId if your addBet function 
    // still requires the argument, otherwise update addBet to make it optional.
    const result = await addBet(betData.userId || 'system_user', betData);
    
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error: any) {
    console.error("POST API ERROR:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: "Missing bet ID" }, { status: 400 });
    }

    const result = await deleteBet(id);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("DELETE API ERROR:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}