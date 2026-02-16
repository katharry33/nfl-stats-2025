// src/context/AuthContext.tsx
'use client';

import React, { createContext, useContext } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase/client';
import type { User } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';

interface AuthContextType {
  user: User | null | undefined;
  loading: boolean;
  error: Error | undefined;
}

interface FirestoreContextType {
  db: Firestore;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const FirestoreContext = createContext<FirestoreContextType | undefined>(undefined);

export function FirebaseProvider({ children }: { children: React.ReactNode }) {
  const [user, loading, error] = useAuthState(auth);

  return (
    <AuthContext.Provider value={{ user, loading, error }}>
      <FirestoreContext.Provider value={{ db }}>
        {children}
      </FirestoreContext.Provider>
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within a FirebaseProvider');
  }
  return context;
}

export function useFirestore() {
  const context = useContext(FirestoreContext);
  if (context === undefined) {
    throw new Error('useFirestore must be used within a FirebaseProvider');
  }
  return context.db;
}