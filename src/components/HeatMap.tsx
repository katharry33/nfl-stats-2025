import { HeatCell } from "./HeatCell";

type HeatMapProps = {
  data: number[][];
};

export function HeatMap({ data }: HeatMapProps) {
  return (
    <div className="overflow-x-auto">
      <div className="inline-grid grid-cols-6 gap-2">
        {data.flat().map((v, i) => (
          <HeatCell key={i} value={v} />
        ))}
      </div>
    </div>
  );
}