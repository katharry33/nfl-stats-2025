'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Loader2, RefreshCw, Search } from 'lucide-react';
import { db } from '@/lib/firebase/config';
import { collection, query, getDocs, orderBy } from 'firebase/firestore';
import { BettingStats } from '@/components/bets/betting-stats';
import { BetsTable } from '@/components/bets/BetsTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

import { DataInspectorModal } from '@/components/DataInspectorModal';

// ─────────────────────────────────────────────
// Local normalizer — simple, league‑agnostic
// ─────────────────────────────────────────────
function normalizePlayerNameLocal(name: string) {
  return (name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

// ─────────────────────────────────────────────
// Derive season from gameDate (NFL + NBA)
// ─────────────────────────────────────────────
function deriveSeason(gameDate: string | null) {
  if (!gameDate) return null;

  const d = new Date(gameDate);
  if (isNaN(d.getTime())) return null;

  const year = d.getFullYear();
  const month = d.getMonth() + 1; // 1–12

  // Aug–Dec → season starts this year
  if (month >= 8) {
    const next = (year + 1).toString().slice(-2);
    return `${year.toString().slice(-2)}-${next}`;
  }

  // Jan–July → season started last year
  const prev = (year - 1).toString().slice(-2);
  return `${prev}-${year.toString().slice(-2)}`;
}

export default function BettingLogPage() {
  const [bets, setBets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [sport, setSport] = useState<'nba' | 'nfl'>('nfl');
  const [search, setSearch] = useState('');
  const [season, setSeason] = useState<'all' | '24-25' | '25-26'>('all');

  // Inspector modal state
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [inspectorData, setInspectorData] = useState<any>(null);

  const openInspector = (bet: any) => {
    setInspectorData(bet);
    setInspectorOpen(true);
  };

    // ─────────────────────────────────────────────
  // Fetch + Normalize + Group by parlayid
  // ─────────────────────────────────────────────
  const fetchBets = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'bettingLog'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);

      // Normalize each raw Firestore doc
      const normalized = snapshot.docs.map(doc => {
        const d = doc.data();

        return {
          id: doc.id,
          parlayid: d.parlayid ?? doc.id,
          createdAt: d.createdAt ?? d.date ?? d.gameDate ?? null,

          // ⭐ NFL + NBA fields
          week: d.week ?? null,
          gameDate: d.gameDate ?? null,
          season: deriveSeason(d.gameDate ?? null),

          stake: d.stake ?? 0,
          odds: d.parlayOdds ?? d.odds ?? 0,
          result: d.result ?? d.status ?? "pending",
          isParlay: d.isParlay ?? false,
          isBonusBet: d.isBonusBet ?? false,
          boost: d.boost ?? 0,
          league: d.league ?? "nfl",

          // Legs array stays intact
          legs: d.legs ?? [],
        };
      });

      // Group by parlayid → one row per slip
      const grouped = Object.values(
        normalized.reduce((acc: any, bet: any) => {
          const pid = bet.parlayid;

          if (!acc[pid]) {
            acc[pid] = {
              parlayid: pid,
              createdAt: bet.createdAt,

              // ⭐ REQUIRED FOR TABLE DISPLAY
              week: bet.week ?? null,
              gameDate: bet.gameDate ?? null,
              season: bet.season ?? null,

              stake: bet.stake,
              odds: bet.odds,
              result: bet.result,
              isParlay: bet.isParlay,
              isBonusBet: bet.isBonusBet,
              boost: bet.boost,
              league: bet.league,
              legs: [],
            };
          }

          // Append all legs from this bet
          acc[pid].legs.push(...bet.legs);

          return acc;
        }, {})
      );

      setBets(grouped);
    } catch (error) {
      console.error('[BettingLog] Fetch error:', error);
      toast.error('Failed to load betting log history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBets();
  }, []);

  // ─────────────────────────────────────────────
  // Sync NBA results (admin action)
  // ─────────────────────────────────────────────
  const syncNbaResults = async () => {
    setIsSyncing(true);
    const toastId = toast.loading('Syncing NBA box scores...');

    try {
      const res = await fetch('/api/betting-log/sync-nba', { method: 'POST' });

      if (!res.ok) throw new Error('Sync API returned an error');

      toast.success('NBA Results Synced', { id: toastId });
      fetchBets();
    } catch (e) {
      toast.error('Sync failed. Check API logs.', { id: toastId });
    } finally {
      setIsSyncing(false);
    }
  };

    // ─────────────────────────────────────────────
  // Filtered bets (sport + season + search)
  // ─────────────────────────────────────────────
  const filteredBets = useMemo(() => {
    const normalizedQuery = normalizePlayerNameLocal(search);

    return bets.filter(bet => {
      const matchesSport =
        bet.league?.toLowerCase() === sport.toLowerCase();

      const matchesSeason =
        season === 'all' || bet.season === season;

      // Search across all legs
      const matchesSearch = bet.legs.some((leg: any) =>
        normalizePlayerNameLocal(leg.player || '').includes(normalizedQuery)
      );

      return matchesSport && matchesSeason && matchesSearch;
    });
  }, [bets, search, sport, season]);

  // ─────────────────────────────────────────────
  // Loading state
  // ─────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-indigo-500" size={40} />
          <p className="text-zinc-500 text-xs font-black uppercase tracking-widest animate-pulse">
            Accessing Vault...
          </p>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────
  // Page
  // ─────────────────────────────────────────────
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black italic uppercase tracking-tighter text-white">
            Log <span className="text-indigo-500 text-glow">Vault</span>
          </h1>
          <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em] mt-1">
            Historical Performance & Automated Grading
          </p>
        </div>

        <div className="flex gap-3">
          <Button
            onClick={syncNbaResults}
            disabled={isSyncing || sport !== 'nba'}
            variant="outline"
            className="border-white/5 bg-zinc-900/50 hover:bg-zinc-800 text-[10px] font-black uppercase tracking-widest h-10 px-6 rounded-xl transition-all"
          >
            <RefreshCw
              className={`mr-2 h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`}
            />
            Sync {sport.toUpperCase()} Scores
          </Button>
        </div>
      </div>

      {/* Stats */}
      <BettingStats bets={filteredBets} />

      {/* Table Container */}
      <div className="bg-[#0a0a0a] border border-white/5 rounded-[32px] overflow-hidden shadow-2xl border-t-white/10">
        <div className="p-5 border-b border-white/5 flex flex-col md:flex-row gap-4 items-center justify-between bg-zinc-900/20">
          
          {/* Sport Toggle */}
          <div className="flex p-1.5 bg-black/40 border border-white/5 rounded-2xl">
            {(['nba', 'nfl'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSport(s)}
                className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  sport === s
                    ? 'bg-indigo-600 text-white shadow-[0_0_20px_rgba(79,70,229,0.4)]'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Season Segmented Control */}
          <div className="flex p-1.5 bg-black/40 border border-white/5 rounded-2xl">
            {[
              { label: 'All', value: 'all' },
              { label: '24–25', value: '24-25' },
              { label: '25–26', value: '25-26' },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSeason(opt.value as any)}
                className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  season === opt.value
                    ? 'bg-indigo-600 text-white shadow-[0_0_20px_rgba(79,70,229,0.4)]'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative w-full md:max-w-sm">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 w-4 h-4" />
            <Input
              placeholder="Search players (e.g. Mahomes)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-11 bg-black/40 border-white/5 focus:border-indigo-500/50 h-12 text-sm font-medium rounded-2xl transition-all"
            />
          </div>
        </div>
        {/* Table */}
        <div className="p-2">
          <BetsTable
            bets={filteredBets}
            onEdit={openInspector}
          />
        </div>
      </div>

      {/* Data Inspector Modal */}
      <DataInspectorModal
        isOpen={inspectorOpen}
        onClose={() => setInspectorOpen(false)}
        data={inspectorData}
      />
    </div>
  );
}
