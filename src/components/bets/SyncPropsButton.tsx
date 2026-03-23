'use client';

import React, { useState } from 'react';
import { Database, RefreshCw, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface SyncPropsButtonProps {
  league: string;
  date: string;
  onComplete: () => void;
}

export function SyncPropsButton({ league, date, onComplete }: SyncPropsButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleSync = async () => {
    if (loading) return;
    
    setLoading(true);
    const toastId = toast.loading(`Syncing ${league.toUpperCase()} Slate...`, {
      description: `Fetching lines for ${date} from Odds API`
    });
    
    try {
      // Force=true ensures we overwrite any partial/NaN data from previous failed attempts
      const res = await fetch(`/api/${league}/ingest?date=${date}&force=true`);
      
      if (!res.ok) {
        throw new Error(`Server responded with ${res.status}`);
      }

      const data = await res.json();
      
      if (data.success) {
        const count = data.ingested || 0;
        
        if (count === 0) {
          toast.warning(`No games found for ${date}`, {
            id: toastId,
            description: "Check if the schedule is out yet or try the next day.",
            icon: <AlertCircle className="text-yellow-500" size={16} />
          });
        } else {
          toast.success(`Success! Ingested ${count} props.`, { 
            id: toastId,
            description: `Live lines for ${league.toUpperCase()} are now in Firestore.`
          });
        }
        
        // Always trigger refresh to clear 'Loading' states in the parent
        onComplete();
      } else {
        throw new Error(data.error || 'Failed to sync props');
      }
    } catch (err: any) {
      console.error('Sync Error:', err);
      toast.error('Sync Failed', { 
        id: toastId,
        description: err.message || "The Odds API might be rate-limited or down."
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <button 
      onClick={handleSync}
      disabled={loading}
      className={`
        flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all
        ${loading 
          ? 'bg-blue-500/20 text-blue-300 border-blue-500/30 cursor-wait' 
          : 'bg-blue-600/10 text-blue-400 border border-blue-500/20 hover:bg-blue-600/20 hover:border-blue-500/40'
        }
      `}
    >
      {loading ? (
        <RefreshCw size={14} className="animate-spin" />
      ) : (
        <Database size={14} />
      )}
      {loading ? 'Processing...' : 'Sync Slate'}
    </button>
  );
}