'use client';

import { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { User, signInAnonymously } from 'firebase/auth';
import { Firestore } from 'firebase/firestore';
import { auth, db } from './client'; // Your client-side instances

interface AuthContextType {
  user: User | null;
  loading: boolean;
}

// 1. Update the Context Type
export const AuthContext = createContext<AuthContextType | null>(null);
export const FirestoreContext = createContext<Firestore | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const signIn = async () => {
      try {
        await signInAnonymously(auth);
      } catch (error) {
        console.error("Anonymous sign-in failed:", error);
      }
    };

    signIn();

    // Listen for auth state changes (Anonymous or Permanent)
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function FirebaseProvider({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <FirestoreContext.Provider value={db}>
        {children}
      </FirestoreContext.Provider>
    </AuthProvider>
  );
}

// 2. Update the hooks to handle the potential null value
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context as AuthContextType; // Type assertion since we know it's provided at the root
};

export const useFirestore = () => {
  const context = useContext(FirestoreContext);
  if (context === undefined) {
    throw new Error("useFirestore must be used within a FirebaseProvider");
  }
  return context as Firestore;
};
