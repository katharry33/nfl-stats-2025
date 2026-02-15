import { useFirestore as useFirestoreInstance } from '../lib/firebase/provider'; // Using relative path for stability
import { collection, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';

/**
 * useFirestoreDatabase
 * Custom hook for standard CRUD operations.
 * Renamed to avoid collision with the base useFirestore provider hook.
 */
export const useFirestoreDatabase = (collectionName: string) => {
  const db = useFirestoreInstance();

  const addData = async (data: any) => {
    if (!db) throw new Error("Database not initialized");
    return await addDoc(collection(db, collectionName), data);
  };

  const updateData = async (id: string, data: any) => {
    if (!db) throw new Error("Database not initialized");
    const docRef = doc(db, collectionName, id);
    return await updateDoc(docRef, data);
  };

  const removeData = async (id: string) => {
    if (!db) throw new Error("Database not initialized");
    const docRef = doc(db, collectionName, id);
    return await deleteDoc(docRef);
  };

  return { addData, updateData, removeData, db };
};