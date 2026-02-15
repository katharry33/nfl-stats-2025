'use client';

import React, { useState } from "react";
// Use relative paths to bypass the @ alias errors
import { PageHeader } from "../../components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { db } from "../../lib/firebase";
import { collection, query, where, getDocs, Query } from "firebase/firestore";
import { useBetSlip } from "../../context/betslip-context";
import { toast } from "sonner";

const BetBuilderPage = () => {
  // 1. All state variables must be INSIDE the component
  const [playerSearch, setPlayerSearch] = useState("");
  const [teamSearch, setTeamSearch] = useState("");
  const [matchupSearch, setMatchupSearch] = useState("");
  const [propSearch, setPropSearch] = useState("");
  const [weekSearch, setWeekSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { legs = [] } = useBetSlip() as any;

  // 2. The Search Handler
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // ... search logic here
    setIsLoading(false);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader title="Bet Builder" description="Analytics engine" />
      
      <Card>
        <CardHeader>
          <CardTitle>Search for a Prop</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="player-search">Player</Label>
              <Input 
                id="player-search" 
                value={playerSearch} 
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPlayerSearch(e.target.value)} 
                placeholder="e.g. Mahomes" 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="team-search">Team</Label>
              <Input 
                id="team-search" 
                value={teamSearch} 
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTeamSearch(e.target.value)} 
                placeholder="e.g. Chiefs" 
              />
            </div>
            {/* ... other inputs following the same pattern ... */}
            <div className="flex items-end">
              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? 'Searching...' : 'Search Props'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default BetBuilderPage;