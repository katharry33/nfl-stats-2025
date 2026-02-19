// apps/web/src/app/api/props/enrich/route.ts  — API Route (trigger enrichment)
import { NextRequest, NextResponse } from 'next/server';
import { enrichPropsForWeek } from '@/lib/enrichment/enrichProps';

// Protect with a secret so only you can trigger it
export async function POST(req: NextRequest) {
  const { week, secret } = await req.json();
  
  if (secret !== process.env.ENRICHMENT_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await enrichPropsForWeek(week);
  return NextResponse.json({ success: true });
}