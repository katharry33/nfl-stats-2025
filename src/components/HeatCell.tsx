// components/charts/HeatCell.tsx

type HeatCellProps = { value: number };

export function HeatCell({ value }: HeatCellProps) {
  // Restrained scale: neutral grey → teal → green for positive
  //                   neutral grey → soft red for negative
  // No dark jewel tones — all readable on white card backgrounds
  const style =
    value > 6  ? 'bg-profit     text-white'           :
    value > 3  ? 'bg-profit/60  text-white'           :
    value > 0  ? 'bg-primary/20 text-primary'         :
    value > -3 ? 'bg-loss/20    text-loss'            :
                 'bg-loss/40    text-white';

  const ring = value > 6 ? 'ring-1 ring-profit/50' : '';

  return (
    <div className={`
      h-10 w-10 rounded-md flex items-center justify-center
      text-xs font-semibold tabular-nums select-none
      ${style} ${ring}
    `}>
      {value.toFixed(1)}
    </div>
  );
}

// ─── HeatMap ─────────────────────────────────────────────────────────────────

type HeatMapProps = { data: number[][] };

export function HeatMap({ data }: HeatMapProps) {
  return (
    <div className="overflow-x-auto">
      <div className="inline-grid grid-cols-6 gap-1.5">
        {data.flat().map((v, i) => (
          <HeatCell key={i} value={v} />
        ))}
      </div>
    </div>
  );
}