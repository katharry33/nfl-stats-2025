import { HeatCell } from "./HeatCell"
export function HeatMap({ data }: { data: number[][] }) {

    return (
      <div className="grid grid-cols-6 gap-2">
        {data.flat().map((v, i) => (
          <HeatCell key={i} value={v} />
        ))}
      </div>
    )
  }