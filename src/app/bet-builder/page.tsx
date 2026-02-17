"use client";
import { useBetSlip } from "@/context/betslip-context";

export default function BetBuilderPage() {
  // Use 'selections' instead of 'legs' to match the context fix above
  const { selections, addLeg, clearSlip } = useBetSlip();

  return (
    <div className="max-w-md mx-auto p-4 pb-24">
      <h1 className="text-2xl font-bold mb-4">Bet Builder</h1>
      
      <div className="space-y-4">
        {selections.map((leg) => (
          <div key={leg.id} className="p-3 border rounded-lg bg-white shadow-sm">
            <p className="font-bold">{leg.player}</p>
            <p className="text-sm text-gray-500">{leg.prop}: {leg.line}</p>
          </div>
        ))}
      </div>

      {selections.length > 0 && (
        <button 
          onClick={clearSlip}
          className="mt-4 text-red-500 text-sm font-medium"
        >
          Clear Selections
        </button>
      )}
    </div>
  );
}