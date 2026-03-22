'use client';

import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { User, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { Firestore } from 'firebase/firestore';
import { auth, db } from './client'; 

interface AuthContextType {
  user: User | null;
  loading: boolean;
}

// 1. Initialize with null, but define the possible types clearly
export const AuthContext = createContext<AuthContextType | null>(null);
export const FirestoreContext = createContext<Firestore | null>(null);

export function FirebaseProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Standard anonymous sign-in for tracking/session persistence
    const initAuth = async () => {
      try {
        if (!auth.currentUser) {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Anonymous sign-in failed:", error);
      }
    };

    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      <FirestoreContext.Provider value={db}>
        {children}
      </FirestoreContext.Provider>
    </AuthContext.Provider>
  );
}

// 2. Refined Hooks with proper Null checks
export const useAuth = () => {
  const context = useContext(AuthContext);
  // We check for null because that is our default value
  if (context === null) {
    throw new Error("useAuth must be used within a FirebaseProvider");
  }
  return context;
};

export const useFirestore = () => {
  const context = useContext(FirestoreContext);
  if (context === null) {
    throw new Error("useFirestore must be used within a FirebaseProvider");
  }
  return context;
};