import type { MatrixCell as MatrixCellType, Role } from '@/types';
import { ROLE_LABELS } from '@/types';
import { Tooltip } from '@/components/Tooltip';
import { useMatrixStore } from '@/store';

interface MatrixCellProps {
  role: Role;
  cell: MatrixCellType;
  groupKey: string;
}

export function MatrixCellView({ role, cell, groupKey }: MatrixCellProps) {
  const selectedCell = useMatrixStore(s => s.selectedCell);
  const setSelectedCell = useMatrixStore(s => s.setSelectedCell);
  const isSelected =
    selectedCell?.groupKey === groupKey && selectedCell?.role === role;

  const handleClick = () => {
    setSelectedCell(isSelected ? null : { groupKey, role });
  };

  if (!cell.main) {
    return (
      <div
        data-testid={`cell-${groupKey}-${role}`}
        onClick={handleClick}
        className={`w-16 h-16 border-2 border-dashed rounded-lg flex items-center justify-center text-xs cursor-pointer transition-colors ${
          isSelected
            ? 'border-blue-500 bg-blue-50 text-blue-500'
            : 'border-gray-300 text-gray-400 hover:border-gray-400'
        }`}
      >
        缺失
      </div>
    );
  }

  return (
    <div
      data-testid={`cell-${groupKey}-${role}`}
      onClick={handleClick}
      className={`relative group cursor-pointer rounded-lg transition-shadow ${
        isSelected ? 'ring-2 ring-blue-500 ring-offset-1' : ''
      }`}
    >
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
