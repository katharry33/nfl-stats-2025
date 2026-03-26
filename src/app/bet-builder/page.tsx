'use client';

import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { parse } from 'papaparse';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { PropsTable } from "@/components/bets/PropsTable"; // Changed to named import
import { 
  Alert, AlertDescription, AlertTitle 
} from "@/components/ui/alert";
import { Upload, Inbox, FileText, X } from "lucide-react";

export default function BetBuilderPage() {
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [csvString, setCsvString] = useState('');
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const league = searchParams.get('league') || 'nba';
  const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
  const season = searchParams.get('season') || '2025';

  const handleParse = () => {
    if (!csvString.trim()) {
      setError("CSV data cannot be empty.");
      return;
    }
    setError(null);
    parse(csvString, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setParsedData(results.data);
        toast({ title: "CSV Parsed", description: `${results.data.length} records found.` });
      },
      error: (err: any) => {
        setError(`CSV Parsing Error: ${err.message}`);
      }
    });
  };

  const handleEnrich = async () => {
    if (parsedData.length === 0) {
      toast({ variant: 'destructive', title: "No Data", description: "Parse CSV data before enriching." });
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch(`/api/${league}/enrich`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvString, date, season, league, mode: 'initial_ingest' })
      });

      if (!response.ok) {
        throw new Error(`Enrichment failed with status: ${response.status}`);
      }

      const result = await response.json();
      toast({ 
        title: "Enrichment Complete", 
        description: `${result.createdCount} new props added, ${result.updatedCount} updated.` 
      });
      // Optionally clear state after success
      setCsvString('');
      setParsedData([]);

    } catch (err: any) {
      toast({ variant: 'destructive', title: "Enrichment Error", description: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8">
      <div className="space-y-8">
        <header className="text-center space-y-2">
          <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tighter text-indigo-500 italic">Bet Builder</h1>
          <p className="text-zinc-500 text-sm md:text-base">Paste raw CSV data to parse and enrich player props.</p>
        </header>

        {error && (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card className="bg-zinc-900/50 border-dashed border-zinc-700 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-500" />
              <span>Raw CSV Input</span>
            </CardTitle>
            <CardDescription>Paste the raw text from your CSV file below.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={csvString}
              onChange={(e) => setCsvString(e.target.value)}
              placeholder="Player,Prop,Line,Odds...\nJohn Doe,Points,10.5,-110..."
              className="h-48 bg-zinc-950 border-zinc-800 focus:border-indigo-500/50"
              rows={10}
            />
            <div className="flex flex-col sm:flex-row gap-2">
              <Button onClick={handleParse} className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white font-bold">Parse CSV</Button>
              <Button onClick={() => { setCsvString(''); setParsedData([]); setError(null); }} variant="outline" className="w-full sm:w-auto">Clear</Button>
            </div>
          </CardContent>
        </Card>

        {parsedData.length > 0 && (
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Inbox className="w-5 h-5 text-emerald-500" />
                  <span>Parsed Props</span>
                </CardTitle>
                <CardDescription>{parsedData.length} props ready for enrichment.</CardDescription>
              </div>
              <Button onClick={handleEnrich} disabled={isLoading} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold">
                {isLoading ? 'Enriching...' : 'Enrich & Save'}
              </Button>
            </CardHeader>
            <CardContent>
              <div className="max-h-96 overflow-auto rounded-lg border border-zinc-800">
                <PropsTable data={parsedData} />
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
