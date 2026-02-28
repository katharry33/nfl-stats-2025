// src/lib/props-service.ts
import { 
  collection, query, where, orderBy, limit, startAfter, getDocs 
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { PropData } from "@/lib/types";

export const fetchPaginatedProps = async (filters: any, lastDoc: any = null) => {
  // FIX 1: Match the collection name in your Security Rules
  const propsRef = collection(db, "allProps"); 
  let constraints = [];

  if (filters.week !== 'all') {
    constraints.push(where("week", "==", Number(filters.week)));
  }

  if (filters.propType !== 'all') {
    constraints.push(where("prop", "==", filters.propType));
  }

  if (filters.search) {
    // FIX 2: Prefix search requires an orderBy("player") before other orders
    constraints.push(where("player", ">=", filters.search));
    constraints.push(where("player", "<=", filters.search + "\uf8ff"));
    constraints.push(orderBy("player", "asc")); 
  }

  // 4. Ordering and Pagination
  constraints.push(orderBy("createdAt", "desc")); 
  constraints.push(limit(25));

  if (lastDoc) {
    constraints.push(startAfter(lastDoc));
  }

  try {
    const q = query(propsRef, ...constraints);
    const snapshot = await getDocs(q);
    
    const docs = snapshot.docs.map(d => {
      const data = d.data();
      return {
        id: d.id,
        ...data,
        // Force numbers to prevent NaN in UI
        week: Number(data.week || 0),
        line: Number(data.line || 0)
      };
    }) as PropData[];

    return {
      docs,
      lastVisible: snapshot.docs[snapshot.docs.length - 1]
    };
  } catch (error) {
    console.error("Firestore Query Error:", error);
    return { docs: [], lastVisible: null };
  }
};