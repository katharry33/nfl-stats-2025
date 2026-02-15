import { adminDb } from './src/lib/firebase/admin';

async function verify() {
  const targetCol = 'allProps_2025';
  console.log(`Checking ${targetCol} for Week 22...`);
  
  try {
    const snapshot = await adminDb.collection(targetCol)
      .where('week', '==', 22)
      .get();
    
    if (snapshot.empty) {
      console.log("❌ No Week 22 documents found. The merge might have failed or the 'week' field is a string instead of a number.");
      
      // Secondary check: search for string "22" just in case
      const stringSnapshot = await adminDb.collection(targetCol).where('week', '==', '22').get();
      if (!stringSnapshot.empty) {
        console.log(`⚠️ Found ${stringSnapshot.size} docs where week is a STRING "22". Your query needs them to be NUMBERS.`);
      }
    } else {
      console.log(`✅ Success! Found ${snapshot.size} documents for Week 22.`);
    }
    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}
verify();
