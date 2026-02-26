'use client';

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BonusForm } from "@/components/bonuses/bonus-form";
import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/firebase/client";
import { collection, query, onSnapshot, orderBy, updateDoc, doc } from "firebase/firestore";
import { toast } from "sonner";
import { PlusCircle, Gift, Calendar, Percent, Edit, CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Bonus } from "@/lib/types";
import { resolveFirestoreDate } from "@/lib/types"; // PATCH: Use centralized helper

export default function BonusesPage() {
  const [bonuses, setBonuses] = useState<Bonus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedBonus, setSelectedBonus] = useState<Bonus | null>(null);

  useEffect(() => {
    const bonusesRef = collection(db, "bonuses");
    const q = query(bonusesRef, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const updatedBonuses = snapshot.docs.map((doc) => {
        const data = doc.data();
        const expiration = resolveFirestoreDate(data.expirationDate);
        const now = new Date();
        
        let status = data.status || 'active';
        if (status === 'active' && expiration && expiration < now) {
          status = 'expired';
          updateDoc(doc.ref, { status: 'expired' });
        }
        
        // PATCH: Spread all fields and use safer type assertion
        return {
          id: doc.id,
          ...data,
          status,
          expirationDate: expiration,
          usedAt: data.usedAt ? resolveFirestoreDate(data.usedAt) : undefined,
        } as unknown as Bonus;
      });

      setBonuses(updatedBonuses);
      setIsLoading(false);
    }, (error) => {
      console.error("Firestore listener failed:", error);
      toast.error("Failed to load bonuses");
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSave = () => {
    setIsFormOpen(false);
    setSelectedBonus(null);
  };

  const openForm = (bonus: Bonus | null = null) => {
    setSelectedBonus(bonus);
    setIsFormOpen(true);
  };

  const handleMarkAsUsed = async (bonusId: string) => {
    try {
      await updateDoc(doc(db, "bonuses", bonusId), {
        status: 'used',
        usedAt: new Date(),
      });
      toast.success("Bonus marked as used");
    } catch (error) {
      toast.error("Failed to update bonus");
    }
  };

  const activeBonuses = bonuses.filter(b => b.status === 'active');
  const usedBonuses = bonuses.filter(b => b.status === 'used');
  const expiredBonuses = bonuses.filter(b => b.status === 'expired');

  // PATCH: Updated BonusCard to handle nullable dates from resolveFirestoreDate
  const BonusCard = ({ bonus, showActions = true }: { bonus: Bonus; showActions?: boolean }) => {
    const expirationDate = resolveFirestoreDate(bonus.expirationDate);
    const usedDate = bonus.usedAt ? resolveFirestoreDate(bonus.usedAt) : null;

    return (
      <div className={`p-4 border rounded-lg transition-shadow 
        ${bonus.status === 'active' ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 hover:shadow-md' : ''}
        ${bonus.status === 'used' ? 'bg-blue-50 border-blue-200' : ''}
        ${bonus.status === 'expired' ? 'bg-slate-50 border-slate-200 opacity-60' : ''}
      `}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold text-lg">{bonus.name}</h3>
              <Badge className="bg-green-600 text-white">
                <Percent className="h-3 w-3 mr-1" />
                {bonus.boost}% Boost
              </Badge>
            </div>

            {bonus.description && (
              <p className="text-sm text-slate-600 mb-2">{bonus.description}</p>
            )}

            <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 mb-2">
              <div>
                <span className="font-semibold">Bet Type:</span> {bonus.betType ?? 'Standard'}
              </div>
              <div>
                <span className="font-semibold">Max Wager:</span> ${bonus.maxWager}
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Expires: {expirationDate ? format(expirationDate, "MMM d, yyyy 'at' h:mm a") : 'N/A'}
              </span>
            </div>

            {usedDate && (
              <div className="text-xs text-slate-500 mt-2">
                Used: {format(usedDate, "MMM d, yyyy")}
              </div>
            )}
          </div>

          {showActions && bonus.status === 'active' && (
            <div className="flex gap-2">
              <Button variant="ghost" size="icon" onClick={() => openForm(bonus)}>
                <Edit className="h-4 w-4" />
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleMarkAsUsed(bonus.id)}
                className="text-green-600 border-green-600"
              >
                Mark as Used
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
        <PageHeader
          title="Manage Bonuses"
          description="Track your sportsbook bonuses, boosts, and promotions."
        />

        <Button onClick={() => openForm()} className="w-full md:w-auto">
          <PlusCircle className="mr-2 h-4 w-4" />
          Add New Bonus
        </Button>

        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {selectedBonus ? 'Edit Bonus' : 'Add New Bonus'}
              </DialogTitle>
            </DialogHeader>
            <BonusForm onSave={handleSave} bonusToEdit={selectedBonus} />
          </DialogContent>
        </Dialog>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-green-600" />
              Active Bonuses ({activeBonuses.length})
            </CardTitle>
            <CardDescription>Available bonuses ready to use</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading bonuses...</div>
            ) : activeBonuses.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No active bonuses.</div>
            ) : (
              <div className="space-y-3">
                {activeBonuses.map((bonus) => (
                  <BonusCard key={bonus.id} bonus={bonus} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {usedBonuses.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-blue-600" />
                Bonuses Used ({usedBonuses.length})
              </CardTitle>
              <CardDescription>Bonuses that have been applied to bets</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {usedBonuses.map((bonus) => (
                  <BonusCard key={bonus.id} bonus={bonus} showActions={false} />
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {expiredBonuses.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-slate-500" />
                Expired Bonuses ({expiredBonuses.length})
              </CardTitle>
              <CardDescription>Past bonuses that are no longer active</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {expiredBonuses.map((bonus) => (
                  <BonusCard key={bonus.id} bonus={bonus} showActions={false} />
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
  );
}
