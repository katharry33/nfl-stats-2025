'use client';

import React, { useState } from 'react';
import { RefreshCw, Database } from 'lucide-react';
import { toast } from 'sonner';

export function SyncPropsButton({ league, date, onComplete }: { league: string, date: string, onComplete: () => void }) {
  const [loading, setLoading] = useState(false);

  const handleSync = async () => {
    setLoading(true);
    const toastId = toast.loading(`Syncing ${league.toUpperCase()} props for ${date}...`);
    
    try {
      const res = await fetch(`/api/${league}/ingest?date=${date}&force=true`);
      const data = await res.json();
      
      if (data.success) {
        toast.success(`Ingested ${data.ingested} props!`, { id: toastId });
        onComplete();
      } else {
        throw new Error(data.error || 'Failed to sync');
      }
    } catch (err: any) {
      toast.error(err.message, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <button 
      onClick={handleSync}
      disabled={loading}
      className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-[9px] font-black uppercase bg-blue-500/10 text-blue-400 border border-blue-500/20 disabled:opacity-50"
    >
      <Database size={14} className={loading ? 'animate-spin' : ''} />
      {loading ? 'Syncing...' : 'Sync Slate'}
    </button>
  );
}