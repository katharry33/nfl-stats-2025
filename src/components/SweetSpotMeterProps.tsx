type SweetSpotMeterProps = {
  ev: number
}

export function SweetSpotMeter({ ev }: SweetSpotMeterProps) {

  const percent = Math.min(Math.max((ev + 5) * 10, 0), 100)

  return (

    <div className="w-full">

      <div className="flex justify-between text-xs mb-1 text-muted-foreground">
        <span>Bad</span>
        <span>Sweet Spot</span>
      </div>

      <div className="w-full h-3 bg-muted rounded-full overflow-hidden">

        <div
          className="h-full bg-gradient-to-r from-red-500 via-slate-500 to-emerald-500"
          style={{ width: `${percent}%` }}
        />

      </div>

      <div className="text-right mt-1 text-sm font-semibold text-profit">
        {ev.toFixed(1)}% EV
      </div>

    </div>

  )
}