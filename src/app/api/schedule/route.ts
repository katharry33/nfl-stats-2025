import { NextResponse } from 'next/server';
import { getStaticSchedule } from '@/lib/firebase/server/queries';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const schedule = await getStaticSchedule();
    return NextResponse.json(schedule);
  } catch (error: any) {
    console.error("Schedule API Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch schedule" }, 
      { status: 500 }
    );
  }
}