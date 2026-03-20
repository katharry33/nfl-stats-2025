const GameStatusBadge = ({ status }: { status: string }) => {
  // If the status contains "Qtr", "Half", or "Final", the game is active/over
  const isLive = status.includes('Qtr') || status.includes('Half');
  const isFinal = status.includes('Final');

  if (isLive) return <span className="bg-red-600 text-white px-2 py-1 rounded text-xs animate-pulse">LIVE</span>;
  if (isFinal) return <span className="bg-gray-500 text-white px-2 py-1 rounded text-xs">FINAL</span>;
  
  return <span className="text-gray-400 text-xs">{status}</span>; // Shows "7:30 PM"
};

export default GameStatusBadge;
