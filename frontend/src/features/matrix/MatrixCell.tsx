import type { MatrixCell as MatrixCellType, Role } from '@/types';
import { ROLE_LABELS } from '@/types';
import { Tooltip } from '@/components/Tooltip';

interface MatrixCellProps {
  role: Role;
  cell: MatrixCellType;
  groupKey: string;
}

export function MatrixCellView({ role, cell, groupKey }: MatrixCellProps) {
  if (!cell.main) {
    return (
      <div className="w-16 h-16 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-400 text-xs">
        缺失
      </div>
    );
  }

  return (
    <div className="relative group">
      <Tooltip content={`${groupKey} · ${ROLE_LABELS[role]}`}>
        <img
          src={cell.main.blobUrl}
          alt={cell.main.name}
          className="w-16 h-16 object-cover rounded-lg border border-gray-200"
        />
      </Tooltip>
      {cell.candidates.length > 1 && (
        <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
          {cell.candidates.length}
        </span>
      )}
    </div>
  );
}
