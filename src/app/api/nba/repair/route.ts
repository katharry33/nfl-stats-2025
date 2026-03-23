import { NextRequest, NextResponse } from 'next/server';
import { adminDb as db } from '@/lib/firebase/admin';

export async function GET(req: NextRequest) {
  const season = 2025;
  const colName = `nbaProps_${season}`;
  
  try {
    const snapshot = await db.collection(colName).get();
    if (snapshot.empty) return NextResponse.json({ message: "No data found." });

    let deletedCount = 0;
    let updatedCount = 0;
    let batch = db.batch();
    let count = 0;

    for (const doc of snapshot.docs) {
      const data = doc.data();
      const docId = doc.id;
      
      // 1. DELETE IF NaN (The "Poison" Check)
      const hasNaN = isNaN(Number(data.line)) || isNaN(Number(data.bestOdds));
      
      if (hasNaN) {
        batch.delete(doc.ref);
        deletedCount++;
      } 
      // 2. SHIFT DATE IF IN RANGE (03/19 to 03/22)
      else if (data.gameDate && data.gameDate.startsWith('2026-03')) {
        const day = parseInt(data.gameDate.split('-')[2], 10);
        
        // Target dates that were affected by the UTC rollover
        if (day >= 19 && day <= 22) {
          const newDay = String(day - 1).padStart(2, '0');
          const newDate = `2026-03-${newDay}`;
          
          batch.update(doc.ref, { 
            gameDate: newDate,
            repairNote: "Shifted from UTC to EST" 
          });
          updatedCount++;
        }
      }

      count++;
      if (count >= 400) {
        await batch.commit();
        batch = db.batch();
        count = 0;
      }
    }

    if (count > 0) await batch.commit();

    return NextResponse.json({
      success: true,
      deletedInvalid: deletedCount,
      updatedDates: updatedCount,
      message: "Database scrubbed and dates shifted back 1 day."
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}