"use client";

import { useBetSlip } from "../../context/betslip-context";
import { BetLeg, PropData } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useMemo } from "react";

interface AddToBetslipButtonProps {
    prop: PropData;
    selection: "Over" | "Under" | "";
}

export function AddToBetslipButton({ prop, selection }: AddToBetslipButtonProps) {
    const { addLeg, selections } = useBetSlip();

    const isInBetSlip = useMemo(() => {
        return selections.some(leg => leg.propId === prop.id);
    }, [selections, prop.id]);

    const handleAdd = () => {
        if (!selection) {
            toast.error("Please select Over or Under");
            return;
        }

        if (isInBetSlip) {
            toast.info("This selection is already in your bet slip.");
            return;
        }

        const leg: BetLeg = {
            id: crypto.randomUUID(),
            player: prop.player,
            prop: prop.prop,
            line: prop.line,
            selection: selection,
            odds: (selection === "Over" ? prop.overOdds : prop.underOdds) ?? 0,
            matchup: prop.matchup,
            team: prop.team,
            week: prop.week,
            propId: prop.id,
            source: 'weekly-props',
            status: 'pending'
        };
        addLeg(leg);
        toast.success(`${prop.player} added to bet slip`);
    };

    return (
        <Button
            onClick={handleAdd}
            disabled={!selection || isInBetSlip}
            className="w-full bg-emerald-600 hover:bg-emerald-700"
        >
            {isInBetSlip ? 'In Bet Slip' : 'Add to Slip'}
        </Button>
    );
}
