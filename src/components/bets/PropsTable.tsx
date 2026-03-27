import { PropDoc } from '@/lib/types';

interface PropsTableProps {
  data: PropDoc[];
  isLoading?: boolean;
  onAddLeg?: (p: PropDoc) => void;
  onEdit?: (p: any) => void;
  onDelete?: (p: any) => void;
  onLoadMore?: () => Promise<void>;
  hasMore?: boolean;
  variant?: string;
}

export const PropsTable = ({ 
  data, 
  isLoading, 
  onAddLeg, 
  onEdit, 
  onDelete, 
  onLoadMore, 
  hasMore, 
  variant 
}: PropsTableProps) => {
  return (
    <div className="relative">
      {/* Your table rendering logic here */}
      {isLoading && <div className="absolute inset-0 bg-white/50" />}
    </div>
  );
};