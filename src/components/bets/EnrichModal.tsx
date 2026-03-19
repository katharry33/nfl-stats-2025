// src/components/bets/EnrichModal.tsx
import { useState } from 'react';
import { toast } from 'sonner';

export function EnrichModal({ isOpen, onClose, onComplete, defaultWeek, defaultSeason }: any) {
  const [loading, setLoading] = useState(false);
  const [force, setForce] = useState(false);

  const handleEnrich = async () => {
    setLoading(true);
    const toastId = toast.loading('Enriching props... this may take a moment.');

    try {
      const res = await fetch('/api/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collection: 'all',
          season: defaultSeason,
          week: defaultWeek,
          skipEnriched: !force,
        }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success(data.message, { id: toastId });
        onComplete();
        onClose();
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      toast.error(`Failed to enrich: ${err.message}`, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-card border border-border w-full max-w-md p-6 rounded-2xl shadow-2xl">
        <h2 className="text-xl font-black uppercase italic italic text-primary">Prop Enrichment</h2>
        <p className="text-muted-foreground text-sm mt-2">
          This will fetch player averages, defensive stats, and calculate win probabilities for 
          <span className="text-foreground font-bold"> Week {defaultWeek || 'All'} </span> 
          of the <span className="text-foreground font-bold"> {defaultSeason} </span> season.
        </p>

        <div className="mt-6 space-y-4">
          <label className="flex items-center gap-3 cursor-pointer group">
            <input 
              type="checkbox" 
              checked={force} 
              onChange={(e) => setForce(e.target.checked)}
              className="w-4 h-4 rounded border-border bg-background text-primary focus:ring-primary/20"
            />
            <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
              Force re-enrich (Overwrite existing stats)
            </span>
          </label>

          <div className="flex gap-3 mt-8">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-border rounded-xl text-sm font-bold uppercase hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleEnrich}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-black uppercase hover:opacity-90 transition-all disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Start Enrichment'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}