type HeatCellProps = {
  value: number;
};

export function HeatCell({ value }: HeatCellProps) {
  const color =
    value > 6  ? 'bg-emerald-500 text-white' :
    value > 3  ? 'bg-emerald-700 text-white' :
    value > 0  ? 'bg-slate-700   text-white' :
    value > -3 ? 'bg-red-700     text-white' :
                 'bg-red-900     text-white/80';

  const glow = value > 6 ? 'ring-2 ring-emerald-400/70' : '';

  return (
    <div
      className={`h-10 w-10 rounded-md flex items-center justify-center text-xs font-semibold ${color} ${glow}`}
    >
      {value.toFixed(1)}
    </div>
  );
}