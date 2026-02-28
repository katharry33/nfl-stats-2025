'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, login, loading } = useAuth(); // Add a 'loading' state to your Context
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // If not loading and no user, you can optionally redirect 
    // but showing the login overlay is cleaner.
  }, [user, loading]);

  if (loading) return <div className="h-screen bg-black flex items-center justify-center text-primary font-black uppercase italic">Loading SweetSpot...</div>;

  if (!user) {
    return (
      <div className="h-screen w-full bg-[#060606] flex flex-col items-center justify-center p-6 text-center">
        <div className="mb-8">
          <h1 className="text-primary font-black text-6xl italic tracking-tighter">SWEET<span className="text-white">SPOT</span></h1>
          <p className="text-zinc-500 font-bold uppercase tracking-[0.3em] mt-2 text-xs">Premium Betting Intelligence</p>
        </div>
        
        <div className="bg-zinc-900/50 border border-white/5 p-8 rounded-3xl max-w-sm w-full shadow-2xl">
          <h2 className="text-white font-black uppercase text-xl mb-6">Restricted Access</h2>
          <button 
            onClick={login}
            className="w-full bg-primary hover:bg-amber-500 text-black font-black py-4 rounded-xl uppercase text-sm transition-all shadow-lg shadow-primary/20"
          >
            Sign in with Google
          </button>
          <p className="text-zinc-600 text-[10px] uppercase font-bold mt-6 tracking-widest leading-loose">
            Authorized Personnel Only.<br/>Authentication required to access props and wallet.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}