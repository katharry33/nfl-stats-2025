'use client';

import { useBetSlip } from "@/context/betslip-context";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useMemo } from "react";
import { BetLeg, PropData } from "@/lib/types";

type SelectionType = 'Over' | 'Under';

// The component now accepts the full prop data and the chosen selection.
export function AddToBetslipButton({
  prop,
  selection,
}: {
  prop: PropData;
  selection: SelectionType | ""; // Can be empty if no selection is made yet
}) {
  const { addLeg, selections } = useBetSlip();

  const isInBetSlip = useMemo(() => {
    if (!selection) return false;
    // A leg is uniquely identified by its propId and the selection (Over/Under)
    return selections.some(
      (leg) => leg.propId === prop.id && leg.selection === selection
    );
  }, [selections, prop.id, selection]);

  const handleAdd = () => {
    if (!selection) {
      toast.error("Please select Over or Under first.");
      return;
    }

    if (isInBetSlip) {
      toast.info("This selection is already in your bet slip.");
      return;
    }

    // The button itself is responsible for constructing the BetLeg.
    const legToAdd: BetLeg = {
      id: `${prop.id}-${selection}`,
      propId: prop.id, // The ID of the original prop
      player: prop.player,
      prop: prop.prop,
      line: prop.line,
      selection: selection,
      odds: selection === "Over" ? prop.overOdds : prop.underOdds,
      matchup: prop.matchup,
      team: prop.team,
      week: prop.week,
      source: "weekly-props",
      status: "pending",
      gameDate: prop.gameDate,
    };

    addLeg(legToAdd);
    toast.success(
      `${prop.player} (${selection} ${prop.line}) added to your bet slip.`
    );
  };

  return (
    <Button
      onClick={handleAdd}
      disabled={!selection || isInBetSlip}
      className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 disabled:text-slate-400"
    >
      {isInBetSlip ? "In Bet Slip" : "Add to Slip"}
    </Button>
  );
}
