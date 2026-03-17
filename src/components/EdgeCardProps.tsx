import React from "react";

type EdgeCardProps = {
  player: string;
  market: string;
  line: string;
  book: string;
  ev: number;
  stake: number;
  className?: string; // for mobile layout
};

export function EdgeCard({
  player,
  market,
  line,
  book,
  ev,
  stake,
  className = "",
}: EdgeCardProps) {
  // EV color mapping
  const evColor =
    ev >= 5
      ? "text-emerald-400"   // high EV
      : ev >= 2
      ? "text-teal-400"      // medium EV
      : "text-muted-foreground"; // low EV

  // Glow for very high EV
  const glow =
    ev >= 6
      ? "drop-shadow-[0_0_8px_rgba(16,185,129,0.65)]"
      : "";

  return (
    <div
      className={`bg-card border border-border rounded-xl p-4 flex flex-col gap-2 hover:border-emerald-500/40 transition-colors ${className}`}
    >
      {/* Top Row */}
      <div className="flex justify-between items-center">
        <span className={`font-bold text-lg ${evColor} ${glow}`}>
          +{ev.toFixed(1)}% EV
        </span>
        <span className="text-xs text-muted-foreground">{book}</span>
      </div>

      {/* Player */}
      <div className="text-sm font-medium">{player}</div>

      {/* Market */}
      <div className="text-sm text-muted-foreground">
        {market} • {line}
      </div>

      {/* Stake */}
      <div className="flex justify-between items-center mt-2">
        <span className="text-xs text-muted-foreground">Suggested Stake</span>
        <span className="font-semibold">${stake}</span>
      </div>
    </div>
  );
}