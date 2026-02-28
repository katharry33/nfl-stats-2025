'use client';
import { useAuth } from "@/context/AuthContext";
import { Brand } from '@/components/layout/brand';

export function MainGuard({ children }: { children: React.ReactNode }) {
  const { user, loading, login } = useAuth();

  if (loading) {
    return <div className="h-screen bg-black flex items-center justify-center text-primary font-black italic">LOADING...</div>;
  }

  if (!user) {
    return (
      <div className="h-screen bg-[#060606] flex flex-col items-center justify-center">
        <Brand />
        <button 
          onClick={login}
          className="mt-8 bg-primary text-black font-black px-10 py-4 rounded-2xl uppercase text-xs shadow-lg shadow-primary/20"
        >
          Login with Google
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
