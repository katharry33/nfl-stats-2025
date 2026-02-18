'use client';

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase/client";
import { collection, query, orderBy, getDocs } from "firebase/firestore";
import { Bet } from "@/lib/types";
import { AppLayout } from "@/components/layout/app-layout"; // Add this import

export default function BettingLogPage() {
  const [bets, setBets] = useState<Bet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAllBets() {
      try {
        setLoading(true);
        const q = query(
          collection(db, "bettingLog"), 
          orderBy("createdAt", "desc")
        );
        
        const snapshot = await getDocs(q);
        
        const fetchedBets = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
          };
        }) as Bet[];
        
        setBets(fetchedBets);
      } catch (error) {
        console.error("Error fetching all bets:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchAllBets();
  }, []);

  return (
    <AppLayout>
      <div className="p-8 max-w-5xl mx-auto">
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
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-card rounded-xl border border-border" />
            ))}
          </div>
        ) : bets.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed border-border rounded-2xl">
            <p className="text-muted-foreground">No bets found in the master log.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {bets.map((bet) => (
              <div 
                key={bet.id} 
                className="group bg-card hover:bg-accent/5 border border-border rounded-xl p-5 transition-all duration-200"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-black bg-emerald-500 text-black px-1.5 py-0.5 rounded uppercase">
                        {bet.betType}
                      </span>
                      <span className="text-xs text-muted-foreground font-mono">
                        ID: {bet.id.slice(0, 8)}
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-white">
                      ${Number(bet.stake).toLocaleString()}
                    </p>
                  </div>
                  
                  <div className="text-right">
                    <span className={`text-sm font-black uppercase tracking-widest ${
                      bet.status === 'won' ? 'text-emerald-400' : 'text-destructive'
                    }`}>
                      {bet.status}
                    </span>
                    <p className="text-[10px] text-muted-foreground mt-1 uppercase">
                      Resulted
                    </p>
                  </div>
                </div>

                {/* Optional: Add a small preview of legs if they exist */}
                {bet.legs && bet.legs.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-border/50 flex gap-4 overflow-x-auto pb-2">
                    {bet.legs.map((leg: any, idx: number) => (
                      <div key={idx} className="shrink-0 text-[11px]">
                        <p className="text-white font-bold">{leg.player || 'Player'}</p>
                        <p className="text-muted-foreground">{leg.prop} {leg.line}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}