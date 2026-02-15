/**
 * Post-Game Stats Page
 * Load game results and calculate bet outcomes
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Play, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target
} from 'lucide-react';

interface PostGameSummary {
  week: number;
  totalProps: number;
  withGameStats: number;
  withResults: number;
  completeness: {
    gameStats: number;
    results: number;
  };
  results: {
    wins: number;
    losses: number;
    pushes: number;
    winRate: number;
  };
  financials: {
    totalStake: number;
    totalProfitLoss: number;
    roi: number;
  };
}

export default function PostGameStatsPage() {
  const [week, setWeek] = useState<number>(19);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [summary, setSummary] = useState<PostGameSummary | null>(null);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (week) {
      loadSummary();
    }
  }, [week]);

  const loadSummary = async () => {
    try {
      const response = await fetch(`/api/post-game-summary?week=${week}`);
      const data = await response.json();
      setSummary(data);
    } catch (err) {
      console.error('Failed to load summary:', err);
    }
  };

  const runPostGameWorkflow = async () => {
    setLoading(true);
    setProgress(0);
    setError(null);
    setResult(null);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 1000);

      const response = await fetch('/api/post-game-workflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ week })
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (!response.ok) {
        throw new Error('Failed to run post-game workflow');
      }

      const data = await response.json();
      setResult(data);

      // Refresh summary
      await loadSummary();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">
            🏈 Post-Game Stats & Results
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-2">
                Week Number
              </label>
              <Input
                type="number"
                value={week}
                onChange={(e) => setWeek(parseInt(e.target.value))}
                disabled={loading}
                min={1}
                max={22}
              />
            </div>
            <Button
              onClick={runPostGameWorkflow}
              disabled={loading}
              size="lg"
              className="mt-7 bg-green-600 hover:bg-green-700"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Load Game Results
                </>
              )}
            </Button>
          </div>

          {loading && (
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <p className="text-sm text-gray-500 text-center">
                {progress < 50
                  ? 'Loading game stats from PFR...'
                  : 'Calculating results...'}
              </p>
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Current Summary */}
      {summary && (
        <>
          {/* Completeness Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      Game Stats Loaded
                    </p>
                    <p className="text-2xl font-bold">
                      {summary.withGameStats}/{summary.totalProps}
                    </p>
                    <Badge
                      variant={
                        summary.completeness.gameStats >= 90
                          ? 'default'
                          : 'secondary'
                      }
                      className="mt-2"
                    >
                      {summary.completeness.gameStats}% Complete
                    </Badge>
                  </div>
                  <Target className="h-12 w-12 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      Results Calculated
                    </p>
                    <p className="text-2xl font-bold">
                      {summary.withResults}/{summary.totalProps}
                    </p>
                    <Badge
                      variant={
                        summary.completeness.results >= 90
                          ? 'default'
                          : 'secondary'
                      }
                      className="mt-2"
                    >
                      {summary.completeness.results}% Complete
                    </Badge>
                  </div>
                  <CheckCircle className="h-12 w-12 text-green-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Results Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Week {week} Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <p className="text-3xl font-bold text-green-600">
                    {summary.results.wins}
                  </p>
                  <p className="text-sm text-gray-600">Wins</p>
                </div>

                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <XCircle className="h-8 w-8 text-red-600 mx-auto mb-2" />
                  <p className="text-3xl font-bold text-red-600">
                    {summary.results.losses}
                  </p>
                  <p className="text-sm text-gray-600">Losses</p>
                </div>

                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="h-8 w-8 rounded-full bg-gray-400 mx-auto mb-2" />
                  <p className="text-3xl font-bold text-gray-600">
                    {summary.results.pushes}
                  </p>
                  <p className="text-sm text-gray-600">Pushes</p>
                </div>

                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <Target className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <p className="text-3xl font-bold text-blue-600">
                    {summary.results.winRate.toFixed(1)}%
                  </p>
                  <p className="text-sm text-gray-600">Win Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Financial Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Financial Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <DollarSign className="h-8 w-8 text-gray-600 mx-auto mb-2" />
                  <p className="text-3xl font-bold">
                    ${summary.financials.totalStake.toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-600">Total Wagered</p>
                </div>

                <div
                  className={`text-center p-4 border rounded-lg ${
                    summary.financials.totalProfitLoss >= 0
                      ? 'bg-green-50 border-green-200'
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  {summary.financials.totalProfitLoss >= 0 ? (
                    <TrendingUp className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  ) : (
                    <TrendingDown className="h-8 w-8 text-red-600 mx-auto mb-2" />
                  )}
                  <p
                    className={`text-3xl font-bold ${
                      summary.financials.totalProfitLoss >= 0
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}
                  >
                    ${Math.abs(summary.financials.totalProfitLoss).toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-600">
                    {summary.financials.totalProfitLoss >= 0
                      ? 'Profit'
                      : 'Loss'}
                  </p>
                </div>

                <div
                  className={`text-center p-4 border rounded-lg ${
                    summary.financials.roi >= 0
                      ? 'bg-green-50 border-green-200'
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  <p
                    className={`text-3xl font-bold ${
                      summary.financials.roi >= 0
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}
                  >
                    {summary.financials.roi.toFixed(1)}%
                  </p>
                  <p className="text-sm text-gray-600">ROI</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Workflow Result */}
      {result && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Post-Game Workflow Complete!</strong>
            <div className="mt-2 space-y-1 text-sm">
              <div>
                ✅ Game Stats: {result.gameStats.updated} props updated
              </div>
              <div>
                ✅ Results: {result.actualResults.updated} props calculated
              </div>
              {result.summary.totalErrors > 0 && (
                <div className="text-red-600">
                  ⚠️ {result.summary.totalErrors} errors encountered
                </div>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-4">
          <h4 className="font-semibold text-sm mb-2 text-blue-900">
            ℹ️ How It Works
          </h4>
          <ul className="text-xs space-y-1 text-blue-800">
            <li>
              1. <strong>Load Game Stats</strong> - Fetches actual player
              performance from PFR (uses cache when available)
            </li>
            <li>
              2. <strong>Calculate Combos</strong> - Automatically computes
              combo props (Rush+Rec Yards, etc.)
            </li>
            <li>
              3. <strong>Determine Results</strong> - Compares game stats vs
              line to calculate Win/Loss/Push
            </li>
            <li>
              4. <strong>Calculate P&L</strong> - If bet amounts exist,
              calculates profit/loss based on odds
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}