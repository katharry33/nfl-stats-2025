
'use client';

// 1. IMPORT the raw auth instance directly from your config
import { auth } from '@/lib/firebase/client'; 
import { useAuthState } from 'react-firebase-hooks/auth';
import { signInAnonymously } from 'firebase/auth';
import { useEffect } from 'react';

export function ClientProvider({ children }: { children: React.ReactNode }) {
  // 2. DO NOT use useAuth() here. Pass the raw 'auth' imported above.
  const [user, loading, error] = useAuthState(auth);

  useEffect(() => {
    if (!loading && !user) {
      // 3. Use the raw auth here as well
      signInAnonymously(auth).catch(console.error);
    }
  }, [user, loading]);

  if (loading) return <div>Loading Auth...</div>;

  return <>{children}</>;
}
