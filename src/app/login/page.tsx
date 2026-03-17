'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function PasswordGate() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/auth/gate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        // Force a refresh to update the middleware's cookie check
        router.push('/');
        router.refresh();
      } else {
        alert('Wrong password');
      }
    } catch (err) {
      alert('Connection error. Check if the server is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 font-sans">
      <form 
        onSubmit={handleSubmit} 
        className="bg-zinc-900 border border-white/10 p-8 rounded-[2rem] w-full max-w-sm space-y-4 shadow-2xl"
      >
        <div className="space-y-1">
          <h1 className="text-foreground font-black italic uppercase text-2xl tracking-tighter">
            Private Access
          </h1>
          <p className="text-muted-foreground text-xs uppercase font-bold">Authenticated Sessions Only</p>
        </div>

        <input
          type="password"
          placeholder="Enter Site Password"
          className="w-full bg-black border border-white/10 rounded-xl px-4 py-4 text-foreground outline-none focus:border-[#FFD700] transition-colors"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
          autoFocus
        />

        <button 
          type="submit"
          disabled={loading}
          className="w-full bg-[#FFD700] hover:bg-[#ffea00] disabled:bg-zinc-700 text-black font-black py-4 rounded-xl uppercase transition-all active:scale-[0.98]"
        >
          {loading ? 'Verifying...' : 'Enter'}
        </button>
      </form>
    </div>
  );
}