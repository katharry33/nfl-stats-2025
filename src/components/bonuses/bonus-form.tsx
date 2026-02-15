// src/components/bonuses/bonus-form.tsx
'use client';

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { db } from "@/lib/firebase";
import { collection, addDoc, updateDoc, doc, serverTimestamp } from "firebase/firestore";
import type { Bonus, BetType } from "@/lib/types";

interface BonusFormProps {
  onSave: (bonus: Bonus) => void;
  bonusToEdit?: Bonus | null;
}

export function BonusForm({ onSave, bonusToEdit }: BonusFormProps) {
  const [name, setName] = useState("");
  const [boost, setBoost] = useState("");
  const [betType, setBetType] = useState<BetType | 'any'>("any");
  const [maxWager, setMaxWager] = useState("");
  const [expirationDate, setExpirationDate] = useState<Date>();
  const [expirationTime, setExpirationTime] = useState("23:59");
  const [description, setDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Populate form when editing
  useEffect(() => {
    if (bonusToEdit) {
      setName(bonusToEdit.name || "");
      setBoost(String(bonusToEdit.boost || ""));
      setBetType(bonusToEdit.betType || "any");
      setMaxWager(String(bonusToEdit.maxWager || ""));
      setDescription(bonusToEdit.description || "");
      
      if (bonusToEdit.expirationDate) {
        const date = bonusToEdit.expirationDate.toDate 
          ? bonusToEdit.expirationDate.toDate() 
          : new Date(bonusToEdit.expirationDate);
        setExpirationDate(date);
        setExpirationTime(format(date, "HH:mm"));
      }
    }
  }, [bonusToEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !boost || !maxWager || !expirationDate) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSaving(true);

    try {
      // Combine date and time
      const [hours, minutes] = expirationTime.split(':');
      const combinedDateTime = new Date(expirationDate);
      combinedDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      const bonusData = {
        name,
        boost: parseFloat(boost),
        betType,
        maxWager: parseFloat(maxWager),
        expirationDate: combinedDateTime,
        description,
        status: 'active' as const,
        updatedAt: serverTimestamp(),
      };

      if (bonusToEdit?.id) {
        // Update existing bonus
        await updateDoc(doc(db, "bonuses", bonusToEdit.id), bonusData);
        toast.success("Bonus updated successfully!");
      } else {
        // Create new bonus
        const newDoc = await addDoc(collection(db, "bonuses"), {
          ...bonusData,
          createdAt: serverTimestamp(),
        });
        
        toast.success("Bonus created successfully!");
      }

      // Reset form
      setName("");
      setBoost("");
      setBetType("any");
      setMaxWager("");
      setExpirationDate(undefined);
      setExpirationTime("23:59");
      setDescription("");
      
      onSave({ id: bonusToEdit?.id || '', ...bonusData } as Bonus);
    } catch (error) {
      console.error("Error saving bonus:", error);
      toast.error("Failed to save bonus");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Bet Name *</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., DraftKings 50% Profit Boost"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="boost">Boost % *</Label>
          <Input
            id="boost"
            type="number"
            step="0.01"
            value={boost}
            onChange={(e) => setBoost(e.target.value)}
            placeholder="50"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="maxWager">Max Wager ($) *</Label>
          <Input
            id="maxWager"
            type="number"
            step="0.01"
            value={maxWager}
            onChange={(e) => setMaxWager(e.target.value)}
            placeholder="100"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="betType">Bet Type *</Label>
        <Select value={betType} onValueChange={(value) => setBetType(value as BetType | 'any')}>
          <SelectTrigger id="betType">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any Bet Type</SelectItem>
            <SelectItem value="single">Single</SelectItem>
            <SelectItem value="parlay">Parlay</SelectItem>
            <SelectItem value="sgp">SGP (Same Game Parlay)</SelectItem>
            <SelectItem value="sgpx">SGPx (Cross-Sport SGP)</SelectItem>
            <SelectItem value="moneyline">Moneyline</SelectItem>
            <SelectItem value="anytime_td">Anytime TD</SelectItem>
            <SelectItem value="round_robin">Round Robin</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Expiration Date & Time *</Label>
        <div className="grid grid-cols-2 gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "justify-start text-left font-normal",
                  !expirationDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {expirationDate ? format(expirationDate, "PPP") : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={expirationDate}
                onSelect={setExpirationDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <Input
            type="time"
            value={expirationTime}
            onChange={(e) => setExpirationTime(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description (Optional)</Label>
        <Input
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g., Valid on NFL parlays only"
        />
      </div>

      <Button type="submit" className="w-full" disabled={isSaving}>
        {isSaving ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : bonusToEdit ? (
          "Update Bonus"
        ) : (
          "Create Bonus"
        )}
      </Button>
    </form>
  );
}