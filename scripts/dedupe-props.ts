import { adminDb } from '../src/lib/firebase/admin';

async function dedupeProps() {
  console.log("🚀 Starting De-duplication...");
  const snap = await adminDb.collection('allProps').get();
  
  // Grouping map: Fingerprint -> Array of Doc References/Data
  const groups: Record<string, any[]> = {};

  snap.docs.forEach(doc => {
    const data = doc.data();
    // Create a unique key for this specific bet prop
    const fingerprint = `${data.playerName}-${data.prop}-${data.line}-${data.week}-${data.matchup}`
      .toLowerCase()
      .replace(/\s+/g, '');

    if (!groups[fingerprint]) groups[fingerprint] = [];
    groups[fingerprint].push({ id: doc.id, ref: doc.ref, ...data });
  });

  let deletedCount = 0;

  for (const key in groups) {
    const records = groups[key];

    if (records.length > 1) {
      // Sort: Records WITH a valid gameDate come first
      // If both have dates, the one with the most recent 'updatedAt' or 'lastPatched' comes first
      records.sort((a, b) => {
        const aHasDate = a.gameDate && a.gameDate !== "1899-12-30" ? 1 : 0;
        const bHasDate = b.gameDate && b.gameDate !== "1899-12-30" ? 1 : 0;
        return bHasDate - aHasDate; 
      });

      // Keep the first one (index 0), delete the rest
      const [toKeep, ...toDelete] = records;

      for (const docToDelete of toDelete) {
        await docToDelete.ref.delete();
        deletedCount++;
        console.log(`🗑️ Deleted Duplicate: ${key} (ID: ${docToDelete.id})`);
      }
    }
  }

  console.log(`\n✅ Finished. Removed ${deletedCount} duplicate records.`);
}

dedupeProps().catch(console.error);