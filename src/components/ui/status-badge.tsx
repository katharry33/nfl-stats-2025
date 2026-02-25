import React from 'react';

type Status = 'win' | 'loss' | 'pending' | 'void';

interface StatusBadgeProps {
  status: Status;
}

const statusStyles: { [key in Status]: string } = {
  win: 'bg-green-500/20 text-green-400 border-green-500/30',
  loss: 'bg-red-500/20 text-red-400 border-red-500/30',
  pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  void: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  if (!status) return null;

  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${statusStyles[status.toLowerCase() as Status] || statusStyles.pending}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

export default StatusBadge;
