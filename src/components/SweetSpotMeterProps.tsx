// components/ui/SweetSpotMeter.tsx

type SweetSpotMeterProps = { ev: number };

export function SweetSpotMeter({ ev }: SweetSpotMeterProps) {
  const percent = Math.min(Math.max((ev + 5) * 10, 0), 100);

  const evColor =
    ev >= 5 ? 'text-profit'         :
    ev >= 2 ? 'text-profit/70'      :
    ev >= 0 ? 'text-muted-foreground':
              'text-loss';

  return (
    <div className="w-full space-y-1.5">

      <div className="flex justify-between text-[11px] text-muted-foreground font-medium">
        <span>Unfavorable</span>
        <span>Sweet Spot</span>
      </div>

      {/* Track */}
      <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${percent}%`,
            // Subtle two-stop gradient: soft red → teal
            background: 'linear-gradient(to right, hsl(0 62% 52%), hsl(174 65% 36%))',
          }}
        />
      </div>

      <div className={`text-right text-sm font-semibold tabular-nums ${evColor}`}>
        {ev >= 0 ? '+' : ''}{ev.toFixed(1)}% EV
      </div>

    </div>
  );
}