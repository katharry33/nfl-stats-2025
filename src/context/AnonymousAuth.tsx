"use client";
import { useEffect } from "react";
import { signInAnonymously } from "firebase/auth";
import { auth } from "@/lib/firebase/client";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const syncAnonymousAuth = async () => {
      try {
        const userCredential = await signInAnonymously(auth);
        const token = await userCredential.user.getIdToken();
        
        // Sync this token to a cookie so Server Components can use the UID
        await fetch("/api/auth/sync", { 
          method: "POST", 
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }) 
        });

        // Set a flag in session storage to avoid re-syncing on every render
        sessionStorage.setItem('anonymous_token_synced', 'true');
      } catch (error) {
        console.error("Anonymous auth sync failed:", error);
      }
    };

    // Only run the sync if the flag is not set in the current session
    if (!sessionStorage.getItem('anonymous_token_synced')) {
      syncAnonymousAuth();
    }
  }, []);

  return <>{children}</>;
}
