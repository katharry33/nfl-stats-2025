"use client";

import { useState, useEffect, useMemo } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { db } from "@/lib/firebase/client";
import { collection, query, onSnapshot } from "firebase/firestore";
import { TrendingUp, Target, Award, Clock, BarChart3, Lightbulb } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface PropData {
  id: string;
  Week: number;
  "Game Time": string;
  Player: string;
  Team: string;
  Prop: string;
  Line: number;
  "Over/Under?": string;
  "Score Diff": number;
  "Win Probability": number;
  "Expected Value": number;
  "Confidence Score": number;
  "Best Edge %": number;
  "Season Hit %": number;
  Odds: number;
  [key: string]: any;
}

export default function InsightsPage() {
  const [props, setProps] = useState<PropData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const propsRef = collection(db, "allProps");
    const q = query(propsRef);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const updatedProps = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as PropData[];

      setProps(updatedProps);
      setIsLoading(false);
    }, (error) => {
      console.error("Firestore listener failed:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Analysis calculations
  const insights = useMemo(() => {
    if (props.length === 0) return null;

    // 1. Success by Prop Type
    const propTypeStats = props.reduce((acc, prop) => {
      const type = prop.Prop || 'Unknown';
      if (!acc[type]) {
        acc[type] = { total: 0, avgWinProb: 0, avgEdge: 0, avgConfidence: 0 };
      }
      acc[type].total++;
      acc[type].avgWinProb += prop["Win Probability"] || 0;
      acc[type].avgEdge += prop["Best Edge %"] || 0;
      acc[type].avgConfidence += prop["Confidence Score"] || 0;
      return acc;
    }, {} as Record<string, any>);

    const propTypeData = Object.entries(propTypeStats).map(([type, stats]) => ({
      propType: type,
      count: stats.total,
      avgWinProb: (stats.avgWinProb / stats.total) * 100,
      avgEdge: (stats.avgEdge / stats.total) * 100,
      avgConfidence: (stats.avgConfidence / stats.total) * 100,
    })).sort((a, b) => b.avgWinProb - a.avgWinProb);

    // 2. Success by Team
    const teamStats = props.reduce((acc, prop) => {
      const team = prop.Team || 'Unknown';
      if (!acc[team]) {
        acc[team] = { total: 0, avgWinProb: 0, avgEdge: 0 };
      }
      acc[team].total++;
      acc[team].avgWinProb += prop["Win Probability"] || 0;
      acc[team].avgEdge += prop["Best Edge %"] || 0;
      return acc;
    }, {} as Record<string, any>);

    const topTeams = Object.entries(teamStats)
      .map(([team, stats]) => ({
        team,
        count: stats.total,
        avgWinProb: (stats.avgWinProb / stats.total) * 100,
        avgEdge: (stats.avgEdge / stats.total) * 100,
      }))
      .sort((a, b) => b.avgWinProb - a.avgWinProb)
      .slice(0, 10);

    // 3. Success by Time of Day
    const timeStats = props.reduce((acc, prop) => {
      const time = prop["Game Time"] || '';
      let period = 'Unknown';
      if (time.includes('AM') || time.includes('1:')) period = 'Early (1pm)';
      else if (time.includes('4:') || time.includes('5:')) period = 'Late (4pm)';
      else if (time.includes('8:') || time.includes('7:')) period = 'Prime (8pm)';
      
      if (!acc[period]) {
        acc[period] = { total: 0, avgWinProb: 0 };
      }
      acc[period].total++;
      acc[period].avgWinProb += prop["Win Probability"] || 0;
      return acc;
    }, {} as Record<string, any>);

    const timeData = Object.entries(timeStats).map(([period, stats]) => ({
      period,
      count: stats.total,
      avgWinProb: (stats.avgWinProb / stats.total) * 100,
    })).sort((a, b) => b.avgWinProb - a.avgWinProb);

    // 4. Top Players by Success Rate
    const playerStats = props.reduce((acc, prop) => {
      const player = prop.Player;
      if (!acc[player]) {
        acc[player] = { total: 0, avgWinProb: 0, avgEdge: 0, avgConfidence: 0 };
      }
      acc[player].total++;
      acc[player].avgWinProb += prop["Win Probability"] || 0;
      acc[player].avgEdge += prop["Best Edge %"] || 0;
      acc[player].avgConfidence += prop["Confidence Score"] || 0;
      return acc;
    }, {} as Record<string, any>);

    const topPlayers = Object.entries(playerStats)
      .filter(([_, stats]) => stats.total >= 3) // At least 3 props
      .map(([player, stats]) => ({
        player,
        count: stats.total,
        avgWinProb: (stats.avgWinProb / stats.total) * 100,
        avgEdge: (stats.avgEdge / stats.total) * 100,
        avgConfidence: (stats.avgConfidence / stats.total) * 100,
      }))
      .sort((a, b) => b.avgWinProb - a.avgWinProb)
      .slice(0, 15);

    // 5. Sweet Spot Ranges (Best Predictors)
    const scoreDiffBuckets = [-10, -5, -2, 0, 2, 5, 10, 20];
    const winProbBuckets = [0, 0.4, 0.5, 0.55, 0.6, 0.65, 0.7, 0.8, 1];
    const evBuckets = [-1, -0.5, 0, 0.1, 0.2, 0.5, 1, 2];
    const confidenceBuckets = [0, 0.3, 0.5, 0.6, 0.7, 0.8, 0.9, 1];

    const analyzeBuckets = (data: PropData[], key: string, buckets: number[]) => {
      const bucketStats = buckets.slice(0, -1).map((min, i) => {
        const max = buckets[i + 1];
        const inRange = data.filter(p => {
          const val = p[key];
          return val >= min && val < max;
        });
        const hitRate = inRange.filter(p => p["Over/Under?"] && p["Season Hit %"] > 0.5).length;
        return {
          range: `${min.toFixed(2)} to ${max.toFixed(2)}`,
          count: inRange.length,
          hitRate: inRange.length > 0 ? (hitRate / inRange.length) * 100 : 0,
          avgWinProb: inRange.length > 0 
            ? (inRange.reduce((sum, p) => sum + (p["Win Probability"] || 0), 0) / inRange.length) * 100 
            : 0,
        };
      });
      return bucketStats.filter(b => b.count >= 5); // Only meaningful sample sizes
    };

    const scoreDiffRanges = analyzeBuckets(props, "Score Diff", scoreDiffBuckets);
    const winProbRanges = analyzeBuckets(props, "Win Probability", winProbBuckets);
    const evRanges = analyzeBuckets(props, "Expected Value", evBuckets);
    const confidenceRanges = analyzeBuckets(props, "Confidence Score", confidenceBuckets);

    // Find sweet spots (highest hit rates)
    const bestScoreDiff = scoreDiffRanges.sort((a, b) => b.hitRate - a.hitRate)[0];
    const bestWinProb = winProbRanges.sort((a, b) => b.hitRate - a.hitRate)[0];
    const bestEV = evRanges.sort((a, b) => b.hitRate - a.hitRate)[0];
    const bestConfidence = confidenceRanges.sort((a, b) => b.hitRate - a.hitRate)[0];

    // 6. Recommendations for Bet Builder
    const recommendedProps = props
      .filter(p => {
        const scoreDiff = p["Score Diff"];
        const winProb = p["Win Probability"];
        const ev = p["Expected Value"];
        const confidence = p["Confidence Score"];

        // Apply sweet spot filters
        return (
          (bestScoreDiff ? scoreDiff >= parseFloat(bestScoreDiff.range.split(' ')[0]) : true) &&
          (bestWinProb ? winProb >= parseFloat(bestWinProb.range.split(' ')[0]) : true) &&
          (bestEV ? ev >= parseFloat(bestEV.range.split(' ')[0]) : true) &&
          (bestConfidence ? confidence >= parseFloat(bestConfidence.range.split(' ')[0]) : true)
        );
      })
      .sort((a, b) => (b["Win Probability"] || 0) - (a["Win Probability"] || 0))
      .slice(0, 10);

    return {
      propTypeData,
      topTeams,
      timeData,
      topPlayers,
      scoreDiffRanges,
      winProbRanges,
      evRanges,
      confidenceRanges,
      sweetSpots: {
        scoreDiff: bestScoreDiff,
        winProb: bestWinProb,
        ev: bestEV,
        confidence: bestConfidence,
      },
      recommendedProps,
      totalProps: props.length,
    };
  }, [props]);

  if (isLoading) {
    return (
        <div className="p-8 max-w-7xl mx-auto">
          <PageHeader title="Market Intelligence Insights" description="Loading analysis..." />
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        </div>
    );
  }

  if (!insights) {
    return (
        <div className="p-8 max-w-7xl mx-auto">
          <PageHeader title="Market Intelligence Insights" description="No data available for analysis" />
        </div>
    );
  }

  return (
      <div className="p-8 max-w-7xl mx-auto">
        <PageHeader
          title="Market Intelligence Insights"
          description={`Data-driven analysis of ${insights.totalProps} available props from all data`}
        />

        {/* Sweet Spots Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {insights.sweetSpots.scoreDiff && (
            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-purple-900 flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Best Score Diff
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-purple-900">{insights.sweetSpots.scoreDiff.range}</p>
                <p className="text-xs text-purple-700 mt-1">
                  {insights.sweetSpots.scoreDiff.hitRate.toFixed(1)}% hit rate
                </p>
              </CardContent>
            </Card>
          )}
          
          {insights.sweetSpots.winProb && (
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-blue-900 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Best Win Prob
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-blue-900">{insights.sweetSpots.winProb.range}</p>
                <p className="text-xs text-blue-700 mt-1">
                  {insights.sweetSpots.winProb.hitRate.toFixed(1)}% hit rate
                </p>
              </CardContent>
            </Card>
          )}

          {insights.sweetSpots.ev && (
            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-green-900 flex items-center gap-2">
                  <Award className="h-4 w-4" />
                  Best EV Range
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-green-900">{insights.sweetSpots.ev.range}</p>
                <p className="text-xs text-green-700 mt-1">
                  {insights.sweetSpots.ev.hitRate.toFixed(1)}% hit rate
                </p>
              </CardContent>
            </Card>
          )}

          {insights.sweetSpots.confidence && (
            <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-amber-900 flex items-center gap-2">
                  <Lightbulb className="h-4 w-4" />
                  Best Confidence
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-amber-900">{insights.sweetSpots.confidence.range}</p>
                <p className="text-xs text-amber-700 mt-1">
                  {insights.sweetSpots.confidence.hitRate.toFixed(1)}% hit rate
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        <Tabs defaultValue="props" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="props">Prop Types</TabsTrigger>
            <TabsTrigger value="teams">Teams</TabsTrigger>
            <TabsTrigger value="players">Players</TabsTrigger>
            <TabsTrigger value="time">Time of Day</TabsTrigger>
            <TabsTrigger value="predictors">Predictors</TabsTrigger>
          </TabsList>

          {/* Prop Types Analysis */}
          <TabsContent value="props" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Success by Prop Type
                </CardTitle>
                <CardDescription>
                  Which prop types have the highest win probability and edge
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={insights.propTypeData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="propType" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="avgWinProb" fill="#8b5cf6" name="Avg Win Prob %" />
                    <Bar dataKey="avgEdge" fill="#10b981" name="Avg Edge %" />
                  </BarChart>
                </ResponsiveContainer>

                <div className="mt-6 space-y-2">
                  <h4 className="font-semibold">Top 5 Prop Types:</h4>
                  {insights.propTypeData.slice(0, 5).map((prop, i) => (
                    <div key={prop.propType} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">{i + 1}</Badge>
                        <span className="font-medium">{prop.propType}</span>
                        <span className="text-sm text-slate-500">({prop.count} props)</span>
                      </div>
                      <div className="flex gap-4 text-sm">
                        <span className="text-purple-600 font-semibold">{prop.avgWinProb.toFixed(1)}% win</span>
                        <span className="text-green-600 font-semibold">{prop.avgEdge.toFixed(1)}% edge</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Teams Analysis */}
          <TabsContent value="teams" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Success by Team</CardTitle>
                <CardDescription>
                  Top 10 teams with the best prop performance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={insights.topTeams} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="team" type="category" width={80} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="avgWinProb" fill="#3b82f6" name="Avg Win Prob %" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Players Analysis */}
          <TabsContent value="players" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Top Players by Success Rate</CardTitle>
                <CardDescription>
                  Players with highest average win probability (min. 3 props)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {insights.topPlayers.map((player, i) => (
                    <div key={player.player} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                      <div className="flex items-center gap-3">
                        <Badge variant={i < 3 ? "default" : "outline"}>{i + 1}</Badge>
                        <div>
                          <p className="font-semibold">{player.player}</p>
                          <p className="text-xs text-slate-500">{player.count} props analyzed</p>
                        </div>
                      </div>
                      <div className="flex gap-4 text-sm">
                        <div className="text-right">
                          <p className="text-purple-600 font-bold">{player.avgWinProb.toFixed(1)}%</p>
                          <p className="text-xs text-slate-500">Win Prob</p>
                        </div>
                        <div className="text-right">
                          <p className="text-green-600 font-bold">{player.avgEdge.toFixed(1)}%</p>
                          <p className="text-xs text-slate-500">Edge</p>
                        </div>
                        <div className="text-right">
                          <p className="text-blue-600 font-bold">{player.avgConfidence.toFixed(1)}%</p>
                          <p className="text-xs text-slate-500">Confidence</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Time of Day Analysis */}
          <TabsContent value="time" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Success by Game Time
                </CardTitle>
                <CardDescription>
                  Are certain game times more predictable?
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={insights.timeData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="avgWinProb" fill="#f59e0b" name="Avg Win Prob %" />
                  </BarChart>
                </ResponsiveContainer>

                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                  {insights.timeData.map((time) => (
                    <Card key={time.period}>
                      <CardContent className="pt-6">
                        <p className="text-sm font-medium text-slate-600">{time.period}</p>
                        <p className="text-2xl font-bold text-amber-600">{time.avgWinProb.toFixed(1)}%</p>
                        <p className="text-xs text-slate-500">{time.count} games</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Predictors/Sweet Spots */}
          <TabsContent value="predictors" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Best Predictor Ranges
                </CardTitle>
                <CardDescription>
                  Optimal ranges for each metric that predict winning bets
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Score Diff */}
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Badge variant="outline">Score Diff</Badge>
                    Sweet Spots
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {insights.scoreDiffRanges.slice(0, 4).map((range, i) => (
                      <div key={i} className={`p-3 rounded-lg border ${i === 0 ? 'bg-purple-50 border-purple-200' : 'bg-slate-50'}`}>
                        <p className="text-sm font-medium">{range.range}</p>
                        <p className="text-lg font-bold text-purple-600">{range.hitRate.toFixed(1)}% hit rate</p>
                        <p className="text-xs text-slate-500">{range.count} props</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Win Probability */}
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Badge variant="outline">Win Probability</Badge>
                    Sweet Spots
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {insights.winProbRanges.slice(0, 4).map((range, i) => (
                      <div key={i} className={`p-3 rounded-lg border ${i === 0 ? 'bg-blue-50 border-blue-200' : 'bg-slate-50'}`}>
                        <p className="text-sm font-medium">{range.range}</p>
                        <p className="text-lg font-bold text-blue-600">{range.hitRate.toFixed(1)}% hit rate</p>
                        <p className="text-xs text-slate-500">{range.count} props</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Expected Value */}
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Badge variant="outline">Expected Value</Badge>
                    Sweet Spots
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {insights.evRanges.slice(0, 4).map((range, i) => (
                      <div key={i} className={`p-3 rounded-lg border ${i === 0 ? 'bg-green-50 border-green-200' : 'bg-slate-50'}`}>
                        <p className="text-sm font-medium">{range.range}</p>
                        <p className="text-lg font-bold text-green-600">{range.hitRate.toFixed(1)}% hit rate</p>
                        <p className="text-xs text-slate-500">{range.count} props</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Confidence Score */}
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Badge variant="outline">Confidence Score</Badge>
                    Sweet Spots
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {insights.confidenceRanges.slice(0, 4).map((range, i) => (
                      <div key={i} className={`p-3 rounded-lg border ${i === 0 ? 'bg-amber-50 border-amber-200' : 'bg-slate-50'}`}>
                        <p className="text-sm font-medium">{range.range}</p>
                        <p className="text-lg font-bold text-amber-600">{range.hitRate.toFixed(1)}% hit rate</p>
                        <p className="text-xs text-slate-500">{range.count} props</p>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recommended Props Based on Sweet Spots */}
            <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-indigo-600" />
                  Recommended Props
                </CardTitle>
                <CardDescription>
                  Top 10 props that fall within all sweet spot ranges
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {insights.recommendedProps.map((prop, i) => (
                    <div key={prop.id} className="p-3 bg-white rounded-lg border border-indigo-200 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge>{i + 1}</Badge>
                            <p className="font-semibold">{prop.Player}</p>
                            <span className="text-xs text-slate-500">{prop.Team}</span>
                          </div>
                          <p className="text-sm text-slate-600">
                            {prop.Prop} - {prop["Over/Under?"]} {prop.Line}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-indigo-600">
                            {((prop["Win Probability"] || 0) * 100).toFixed(1)}%
                          </p>
                          <p className="text-xs text-slate-500">Win Prob</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
  );
}