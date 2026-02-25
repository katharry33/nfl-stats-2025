// src/lib/firebase/queries.ts
import { collection, query, orderBy, limit, startAfter, getDocs, QueryDocumentSnapshot } from "firebase/firestore";
import { db } from "./client";

export async function fetchBettingLogs(
  limitCount: number = 10, 
  lastDoc?: QueryDocumentSnapshot
) {
  let q = query(
    collection(db, "bettingLog"),
    orderBy("gameDate", "desc"), // Default sort
    limit(limitCount)
  );

  if (lastDoc) {
    q = query(q, startAfter(lastDoc));
  }

  const snapshot = await getDocs(q);
  const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  const lastVisible = snapshot.docs[snapshot.docs.length - 1];

  return { logs, lastVisible };
}
