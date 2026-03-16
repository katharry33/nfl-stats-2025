import React from "react"

type HeatCellProps = {
  value: number
}

export function HeatCell({ value }: HeatCellProps) {

  let color =
    value > 6
      ? "bg-emerald-500"
      : value > 3
      ? "bg-emerald-700"
      : value > 0
      ? "bg-slate-700"
      : value > -3
      ? "bg-red-700"
      : "bg-red-900"

  const glow =
    value > 6
      ? "ring-2 ring-emerald-400/70"
      : ""

  return (

    <div
      className={`h-10 w-10 rounded-md flex items-center justify-center text-xs font-semibold text-white ${color} ${glow}`}
    >
      {value.toFixed(1)}
    </div>

  )
}