import { adminDb } from "@/lib/firebase/admin";
import { BetsTable } from "@/components/bets/bets-table";
import { BettingStats } from "@/components/bets/betting-stats";
import { Button } from "@/components/ui/button";
import { PlusCircle, Download } from "lucide-react";
import Link from "next/link";

// 🚩 Force dynamic ensures we get fresh bets on every load
export const dynamic = "force-dynamic";

export default async function BettingLogPage() {
  // 1. Fetch data directly from Firestore on the server
  const snapshot = await adminDb.collection("bettingLog")
    .orderBy("createdAt", "desc")
    .limit(50)
    .get();

  const bets = snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      // 🚩 CRITICAL: Convert Timestamps to ISO strings for Client Components
      createdAt: data.createdAt?.toDate()?.toISOString() || null,
      updatedAt: data.updatedAt?.toDate()?.toISOString() || null,
    };
  }) as any[];

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tighter uppercase italic text-white">
            Betting Log
          </h1>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">
            Studio Terminal / Transaction History
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" className="border-slate-800 bg-slate-900 text-xs font-bold uppercase h-9">
            <Download className="mr-2 h-3.5 w-3.5" /> Export CSV
          </Button>
          <Link href="/bet-builder">
            <Button className="bg-emerald-600 hover:bg-emerald-500 text-xs font-bold uppercase h-9">
              <PlusCircle className="mr-2 h-3.5 w-3.5" /> New Bet
            </Button>
          </Link>
        </div>
      </div>

      {/* 2. Stats Overview - Pass the bets here */}
      <BettingStats bets={bets} />

      {/* 3. The Main Table */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-xl overflow-hidden backdrop-blur-sm">
        <BetsTable bets={bets} />
      </div>
    </div>
  );
}
