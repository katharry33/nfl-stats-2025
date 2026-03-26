// src/components/modals/PostGameModal.tsx

interface PostGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameDate: string;
  league: 'nba' | 'nfl';
  week?: number; // Add this optional prop to fix the TS error
}

export function PostGameModal({ 
  isOpen, 
  onClose, 
  gameDate, 
  league, 
  week 
}: PostGameModalProps) {
  
  // Logic to "Grade" the slate
  const handleGradeSlate = async () => {
    // Now you can safely use 'week' for NFL queries
    const queryParam = league === 'nfl' ? `week=${week}` : `date=${gameDate}`;
    // ... your fetch logic to /api/grade
  };

  if (!isOpen) return null;

  return (
    // Your Modal JSX
    <div>...</div>
  );
}