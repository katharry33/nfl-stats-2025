'use client';

import { useEffect, useState } from "react";
import { Bet } from "@/lib/types";
import { toast } from "sonner";
import { BetsTable } from "@/components/bets/bets-table";

const aggregateBets = (rawDocs: any[]) => {
  const map = new Map();

  rawDocs.forEach(doc => {
    // Determine the unique ID for grouping (Legacy uses parlayid, New uses id)
    const groupId = doc.parlayid || doc.id;

    if (!map.has(groupId)) {
      map.set(groupId, {
        ...doc,
        id: groupId,
        // Standardize status from 'result' or 'status'
        status: (doc.status || doc.result || 'pending').toLowerCase(),
        legs: doc.legs || [] // Start with existing legs if it's a new bet
      });
    }

    const entry = map.get(groupId);

    // If it's a legacy doc (has parlayid), it represents ONE leg. Add it to the array.
    if (doc.parlayid) {
      entry.legs.push({
        player: doc.playerteam || doc.player || 'Legacy Bet',
        prop: doc.prop,
        line: doc.line,
        selection: doc.selection || '',
        odds: doc.odds,
        status: (doc.status || doc.result || 'pending').toLowerCase(),
        matchup: doc.matchup
      });
      
      // If any leg in the legacy parlay is lost, the whole thing is lost
      if (doc.result?.toLowerCase() === 'lost' || doc.status?.toLowerCase() === 'lost') {
        entry.status = 'lost';
      }
    }
  });

  return Array.from(map.values());
};

export default function BettingLogPage() {
  const [bets, setBets] = useState<Bet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBets() {
      try {
        setLoading(true);
        const rawData = await fetch('/api/betting-log').then(res => res.json());
        
        // Transform the data using the new aggregator
        const processedBets = aggregateBets(rawData);

        setBets(processedBets);
        toast.success(`Loaded ${processedBets.length} settled wagers.`);
      } catch (error) {
        console.error("Error fetching bets:", error);
        toast.error("Failed to load betting log.");
      } finally {
        setLoading(false);
      }
    }

    fetchBets();
  }, []);

  // Dummy delete/edit functions for the table
  const handleDelete = (id: string) => {
    toast.info(`DELETE action called for bet ID: ${id}`);
    // Example: setBets(bets.filter(b => b.id !== id));
  };

  const handleEdit = (bet: Bet) => {
    toast.info(`EDIT action called for bet ID: ${bet.id}`);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic">
            Betting Log
          </h1>
          <p className="text-emerald-500 font-mono text-sm">
            {bets.length} TOTAL SETTLED WAGERS
          </p>
        </div>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-48 bg-card rounded-xl border border-border" />
          <div className="h-48 bg-card rounded-xl border border-border" />
        </div>
      ) : bets.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-border rounded-2xl">
          <p className="text-muted-foreground">No bets found in the master log.</p>
        </div>
      ) : (
        // Render the BetsTable with the processed data
        <BetsTable bets={bets} onDelete={handleDelete} onEdit={handleEdit} />
      )}
    </div>
  );
}
