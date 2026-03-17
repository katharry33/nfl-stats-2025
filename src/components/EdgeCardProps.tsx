// components/cards/EdgeCard.tsx

type EdgeCardProps = {
  player:    string;
  market:    string;
  line:      string;
  book:      string;
  ev:        number;
  stake:     number;
  className?: string;
};

export function EdgeCard({ player, market, line, book, ev, stake, className = '' }: EdgeCardProps) {

  // Only two states: meaningful edge (green) or neutral — no rainbow
  const evColor =
    ev >= 5 ? 'text-profit'          :
    ev >= 2 ? 'text-profit/70'       :
              'text-muted-foreground';

  // Subtle left-border accent instead of a glow
  const borderAccent = ev >= 5 ? 'border-l-2 border-l-profit' : '';

  return (
    <div className={`
      bg-card border border-border rounded-xl p-4
      flex flex-col gap-2
      hover:shadow-sm hover:border-border/80
      transition-all duration-150
      ${borderAccent} ${className}
    `}>

      {/* EV + Book */}
      <div className="flex justify-between items-center">
        <span className={`text-sm font-bold tabular-nums ${evColor}`}>
          +{ev.toFixed(1)}% EV
        </span>
        <span className="text-[11px] text-muted-foreground font-medium">{book}</span>
      </div>

      {/* Player */}
      <p className="text-sm font-semibold text-foreground">{player}</p>

      {/* Market */}
      <p className="text-xs text-muted-foreground">{market} · {line}</p>

      {/* Stake */}
      <div className="flex justify-between items-center pt-1 mt-1 border-t border-border">
        <span className="text-[11px] text-muted-foreground">Suggested stake</span>
        <span className="text-sm font-semibold text-foreground tabular-nums">${stake}</span>
      </div>

    </div>
  );
}