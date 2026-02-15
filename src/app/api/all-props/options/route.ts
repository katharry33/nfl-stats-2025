// src/app/api/all-props/options/route.ts
import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = getAdminDb();
    const COLLECTION_NAME = 'allProps_2025';

    // Fetch documents to extract unique values
    // We limit this or use a specific metadata document in production for performance
    const snapshot = await db.collection(COLLECTION_NAME).select('Prop', 'Week').get();

    if (snapshot.empty) {
      // Fallback defaults if the collection is empty
      return NextResponse.json({
        props: ["Passing Yards", "Rushing Yards", "Receiving Yards", "Touchdowns", "Receptions"],
        weeks: Array.from({ length: 18 }, (_, i) => i + 1),
      });
    }

    const uniqueProps = new Set<string>();
    const uniqueWeeks = new Set<number>();

    snapshot.forEach((doc) => {
      const data = doc.data();
      if (data.Prop) uniqueProps.add(data.Prop);
      if (data.Week) uniqueWeeks.add(Number(data.Week));
    });

    return NextResponse.json({
      // Convert sets to sorted arrays
      props: Array.from(uniqueProps).sort(),
      weeks: Array.from(uniqueWeeks).sort((a, b) => a - b),
    });

  } catch (error: any) {
    console.error("❌ Options API Error:", error.message);
    
    // Hard fallback so the UI doesn't break if Firebase is down
    return NextResponse.json({
      props: ["Passing Yards", "Rushing Yards", "Receiving Yards", "Touchdowns"],
      weeks: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18],
      error: "Using fallback values"
    }, { status: 200 });
  }
}