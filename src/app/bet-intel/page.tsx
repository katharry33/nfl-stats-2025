"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { ScrollablePage } from "@/components/layout/scrollable-page";

import { getWeeklyProps } from "@/lib/firebase/weekly-props";
import { getBonuses } from "@/lib/firebase/bonuses";
import { getHistoricalProps } from "@/lib/firebase/historical-props";
import { getBets } from "@/lib/firebase/bets";

import { evaluateAllBonuses } from "@/lib/bonus-engine";
import { analyzeProps, deduplicateProps } from "@/lib/recommendation-engine";
import { normalizeBet } from "@/lib/services/bet-normalizer";

import type { WeeklyProp, Bonus, Bet } from "@/lib/types";

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription
} from "@/components/ui/card";
import { useFirestore } from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import { Trophy, TrendingUp, Target, Database } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export default function BetIntelPage() {
  const [weekly, setWeekly] = useState<WeeklyProp[]>([]);
  const [bonuses, setBonuses] = useState<Bonus[]>([]);
  const [allPropsWithResults, setAllPropsWithResults] = useState<WeeklyProp[]>([]);
  const [loading, setLoading] = useState(true);
  const firestore = useFirestore();
  const { toast } = useToast();

  useEffect(() => {
    if (!firestore) return;
    const load = async () => {
      setLoading(true);
      try {
        const [w, b, historicalProps, personalBets] = await Promise.all([
          getWeeklyProps(firestore),
          getBonuses(firestore),
          getHistoricalProps(firestore),
          getBets(firestore),
        ]);

        // Normalize personal bets to the WeeklyProp format for analysis
        const normalizedPersonalBets = personalBets.map(b => normalizeBet(b) as WeeklyProp);

        // Combine ALL props that have results (whether you bet on them or not)
        // This includes:
        // 1. Historical props from Firestore (all props with actual results)
        // 2. Your personal betting log (bets you actually placed)
        const allCombined = [...historicalProps, ...normalizedPersonalBets];

        // Deduplicate using the enhanced deduplication function
        const uniquePropsWithResults = deduplicateProps(allCombined);

        console.log(`📊 Data sources combined:
          - Historical props: ${historicalProps.length}
          - Personal bets: ${personalBets.length}
          - Total combined: ${allCombined.length}
          - After deduplication: ${uniquePropsWithResults.length}`);

        setWeekly(w);
        setBonuses(b);
        setAllPropsWithResults(uniquePropsWithResults);
      } catch (error) {
        console.error("Failed to load Bet Intel data:", error);
        toast({
          variant: "destructive",
          title: "Error Loading Insights",
          description: "Could not load data for the insights page. Please try again later.",
        });
        setWeekly([]);
        setBonuses([]);
        setAllPropsWithResults([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [firestore, toast]);

  if (loading) {
    return (
      <ScrollablePage
        header={<PageHeader title="Insights" description="Loading…" />}
      >
        <div className="p-4 text-sm text-muted-foreground">Loading…</div>
      </ScrollablePage>
    );
  }

  const intel = analyzeProps(weekly, allPropsWithResults);
  const bonusRecs = evaluateAllBonuses(bonuses, weekly);

  return (
    <ScrollablePage
      header={
        <PageHeader
          title="Insights"
          description="Model-driven insights for this week's slate."
        />
      }
    >
      <div className="space-y-6 p-4">
        <DataSourcePanel intel={intel} />
        <WeeklySummaryPanel intel={intel} weekly={weekly} />
        <WinningDnaPanel intel={intel} />
        <TopBetsPanel intel={intel} />
        <UnderOverPanel intel={intel} />
        <ArchetypePanel intel={intel} />
        <BonusPanel bonusRecs={bonusRecs} />
        <ParlayInsightsPanel intel={intel} />
        <OpponentMismatchPanel intel={intel} />
      </div>
    </ScrollablePage>
  );
}

function DataSourcePanel({ intel }: { intel: any }) {
  const { winningDna } = intel;
  
  if (!winningDna || !winningDna.dataSource) return null;
  
  const { dataSource } = winningDna;
  
  return (
    <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-900/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Database className="h-4 w-4 text-blue-500" />
          Data Analysis Source
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm space-y-2">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-muted-foreground">Total Props Analyzed</div>
            <div className="text-2xl font-bold">{dataSource.totalPropsAnalyzed}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Props with Results</div>
            <div className="text-2xl font-bold">{dataSource.propsWithResults}</div>
          </div>
        </div>
        <div className="pt-2 text-xs text-muted-foreground">
          💡 Analysis includes both historical props and your betting log (deduplicated)
        </div>
      </CardContent>
    </Card>
  );
}

function WeeklySummaryPanel({ intel, weekly }: { intel: any, weekly: WeeklyProp[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Weekly Summary</CardTitle>
      </CardHeader>
      <CardContent className="text-sm space-y-1">
        <div>Total Props: {weekly.length}</div>
        <div>Recommended: {intel.recommended.length}</div>
        <div>High Edge: {intel.highEdge.length}</div>
        <div>High Confidence: {intel.highConfidence.length}</div>
      </CardContent>
    </Card>
  );
}

export function WinningDnaPanel({ intel }: { intel: any }) {
  const { winningDna } = intel;
  
  if (!winningDna || !winningDna.isApplicable) {
      return (
        <Card className="border-muted">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="text-muted-foreground" />
              Winning DNA
            </CardTitle>
            <CardDescription>
              Not enough historical data yet. Need at least 10 winning props to generate insights.
              {winningDna && (
                <span className="block mt-1">
                  Current: {winningDna.totalWins || 0} wins out of {winningDna.totalBets || 0} total props with results
                </span>
              )}
            </CardDescription>
          </CardHeader>
        </Card>
      );
  }

  const formatRange = (range: { min: number, max: number, median?: number }, suffix = '') => {
      if (range.min === undefined || range.max === undefined) return 'N/A';
      if (Math.abs(range.min) < 1 && Math.abs(range.max) < 1 && suffix !== '%') {
        return `${range.min.toFixed(2)}${suffix} - ${range.max.toFixed(2)}${suffix}`;
      }
      return `${range.min.toFixed(1)}${suffix} - ${range.max.toFixed(1)}${suffix}`;
  };

  const formatMedian = (range: { median?: number }, suffix = '') => {
      if (range.median === undefined) return '';
      if (Math.abs(range.median) < 1 && suffix !== '%') {
        return ` (median: ${range.median.toFixed(2)}${suffix})`;
      }
      return ` (median: ${range.median.toFixed(1)}${suffix})`;
  };

  return (
    <Card className="border-accent">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="text-accent" />
          Winning DNA
        </CardTitle>
        <CardDescription>
          Analysis of {winningDna.totalWins} winning props out of {winningDna.totalBets} total 
          ({winningDna.overallWinRate?.toFixed(1)}% win rate)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Top Winning Props */}
        <div>
          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Top 3 Most Profitable Prop Types
          </h4>
          <div className="space-y-3">
            {winningDna.topProps.map((prop: any, idx: number) => (
              <div key={prop.name} className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">
                    {idx + 1}. {prop.name}
                  </span>
                  <Badge variant={idx === 0 ? "default" : "secondary"}>
                    {prop.wins}/{prop.total} ({prop.winRate.toFixed(1)}%)
                  </Badge>
                </div>
                <Progress value={prop.winRate} className="h-2" />
              </div>
            ))}
          </div>
        </div>

        {/* Sweet Spot Ranges */}
        <div>
          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Target className="h-4 w-4" />
            Winning Sweet Spots (25th-75th percentile)
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {winningDna.sweetSpots.scoreDiff && (
              <div className="p-3 bg-muted rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">prop.scoreDifferential</div>
                <div className="text-sm font-semibold">
                  {formatRange(winningDna.sweetSpots.scoreDiff)}
                  <span className="text-xs text-muted-foreground">
                    {formatMedian(winningDna.sweetSpots.scoreDiff)}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {winningDna.sweetSpots.scoreDiff.count} winning props
                </div>
              </div>
            )}
            
            {winningDna.sweetSpots.edgePct && (
              <div className="p-3 bg-muted rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">Edge %</div>
                <div className="text-sm font-semibold">
                  {formatRange(winningDna.sweetSpots.edgePct, '%')}
                  <span className="text-xs text-muted-foreground">
                    {formatMedian(winningDna.sweetSpots.edgePct, '%')}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {winningDna.sweetSpots.edgePct.count} winning props
                </div>
              </div>
            )}
            
            {winningDna.sweetSpots.confidenceScore && (
              <div className="p-3 bg-muted rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">Confidence Score</div>
                <div className="text-sm font-semibold">
                  {formatRange(winningDna.sweetSpots.confidenceScore, '%')}
                  <span className="text-xs text-muted-foreground">
                    {formatMedian(winningDna.sweetSpots.confidenceScore, '%')}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {winningDna.sweetSpots.confidenceScore.count} winning props
                </div>
              </div>
            )}
            
            {winningDna.sweetSpots.seasonHitPct && (
              <div className="p-3 bg-muted rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">Season Hit %</div>
                <div className="text-sm font-semibold">
                  {formatRange(winningDna.sweetSpots.seasonHitPct, '%')}
                  <span className="text-xs text-muted-foreground">
                    {formatMedian(winningDna.sweetSpots.seasonHitPct, '%')}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {winningDna.sweetSpots.seasonHitPct.count} winning props
                </div>
              </div>
            )}
            
            {winningDna.sweetSpots.avgWinProb && (
              <div className="p-3 bg-muted rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">Avg Win Probability</div>
                <div className="text-sm font-semibold">
                  {formatRange(winningDna.sweetSpots.avgWinProb, '%')}
                  <span className="text-xs text-muted-foreground">
                    {formatMedian(winningDna.sweetSpots.avgWinProb, '%')}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {winningDna.sweetSpots.avgWinProb.count} winning props
                </div>
              </div>
            )}
            
            {winningDna.sweetSpots.expectedValue && (
              <div className="p-3 bg-muted rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">Expected Value</div>
                <div className="text-sm font-semibold">
                  {formatRange(winningDna.sweetSpots.expectedValue)}
                  <span className="text-xs text-muted-foreground">
                    {formatMedian(winningDna.sweetSpots.expectedValue)}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {winningDna.sweetSpots.expectedValue.count} winning props
                </div>
              </div>
            )}
            
            {winningDna.sweetSpots.kellyPct && (
              <div className="p-3 bg-muted rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">Kelly %</div>
                <div className="text-sm font-semibold">
                  {formatRange(winningDna.sweetSpots.kellyPct, '%')}
                  <span className="text-xs text-muted-foreground">
                    {formatMedian(winningDna.sweetSpots.kellyPct, '%')}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {winningDna.sweetSpots.kellyPct.count} winning props
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Interpretation */}
        <div className="p-3 bg-accent/10 rounded-lg border border-accent/20">
          <p className="text-xs text-muted-foreground">
            💡 <strong>How to use:</strong> Look for props that fall within these sweet spot ranges. 
            Props in the sweet spot have historically performed well and may represent better betting opportunities.
            The star (⭐) icon in the bet builder indicates when a prop falls within these ranges.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// ... rest of the component functions remain the same
function TopBetsPanel({ intel }: { intel: any }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Bets of the Week</CardTitle>
      </CardHeader>
      <CardContent className="text-sm space-y-1">
        {intel.topBets.map((p: any) => (
          <div key={p.id}>
            {p.player} – {p.prop} {p.overUnder} {p.line} • Edge {p.edgePct}% • Conf{" "}
            {p.confidenceScore}%
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function UnderOverPanel({ intel }: { intel: any }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Best Unders / Best Overs</CardTitle>
      </CardHeader>
      <CardContent className="text-sm space-y-2">
        <div>
          <div className="font-semibold">Best Unders</div>
          {intel.bestUnders.map((p: any) => (
            <div key={p.id}>
              {p.player} – {p.prop} {p.overUnder} {p.line}
            </div>
          ))}
        </div>

        <div>
          <div className="font-semibold">Best Overs</div>
          {intel.bestOvers.map((p: any) => (
            <div key={p.id}>
              {p.player} – {p.prop} {p.overUnder} {p.line}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ArchetypePanel({ intel }: { intel: any }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Archetype Insights</CardTitle>
      </CardHeader>
      <CardContent className="text-sm space-y-1">
        {intel.archetypes.map((a: any) => (
          <div key={a.name}>
            <span className="font-semibold">{a.name}:</span> {a.count} plays
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function BonusPanel({ bonusRecs }: { bonusRecs: any[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Bonus Recommendations</CardTitle>
      </CardHeader>
      <CardContent className="text-sm space-y-2">
        {bonusRecs.map((r: any) => (
          <div key={r.bonusId}>
            <div className="font-semibold">{r.bonusName}</div>
            {r.skip ? (
              <div className="text-red-500">Skip — {r.reason}</div>
            ) : (
              <div>
                Best Single: {r.bestSingle?.player} – {r.bestSingle?.prop}
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function ParlayInsightsPanel({ intel }: { intel: any }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Parlay Insights</CardTitle>
      </CardHeader>
      <CardContent className="text-sm space-y-1">
        {intel.parlayCombos.map((c: any, i: number) => (
          <div key={i}>
            {c.map((p: any) => p.player).join(" + ")}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function OpponentMismatchPanel({ intel }: { intel: any }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Opponent Mismatches</CardTitle>
      </CardHeader>
      <CardContent className="text-sm space-y-1">
        {intel.mismatches.map((m: any) => (
          <div key={m.id}>
            {m.player} vs {m.opponent} • {m.stat} • Rank {m.rank}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}