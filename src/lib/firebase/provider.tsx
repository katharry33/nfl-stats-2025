// src/lib/firebase/provider.tsx
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from './client'; // Points to your existing client.ts
import { onAuthStateChanged, User } from 'firebase/auth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  db: any;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true, db: null });

export function FirebaseProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, db }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

export const useFirestore = () => {
    const context = useContext(AuthContext);
    return context.db;
};