import { NextResponse } from 'next/server';
import { addBet, getBets, deleteBet } from '@/lib/actions/bet-actions';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const sport = searchParams.get('sport') || 'nfl';
  
  const allData = await getBets(sport);
  const sorted = allData.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  
  return NextResponse.json({ bets: sorted });
}

export async function POST(req: Request) {
  const body = await req.json();
  const { sport, ...betData } = body;
  const result = await addBet(betData.userId || 'system', betData, sport);
  return NextResponse.json(result);
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  const sport = searchParams.get('sport') || 'nfl';
  
  const result = await deleteBet(id!, sport);
  return NextResponse.json(result);
}