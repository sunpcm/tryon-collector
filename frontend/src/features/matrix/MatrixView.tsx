import { useMatrixStore } from '@/store';
import { ROLES, ROLE_LABELS, REQUIRED_ROLES } from '@/types';
import { MatrixRowView } from './MatrixRow';

export function MatrixView() {
  const { matrix, unassigned, rowSubmitStatuses } = useMatrixStore();

  if (matrix.length === 0 && unassigned.length === 0) {
    return null;
  }

  const readyCount = matrix.filter(r => r.status === 'ready').length;
  const incompleteCount = matrix.filter(r => r.status === 'incomplete').length;

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 py-2 px-3 bg-gray-50 border-b border-gray-200">
        <div className="w-28 text-xs font-medium text-gray-500">款号</div>
        {ROLES.map(role => (
          <div
            key={role}
            className="w-20 text-center text-xs font-medium text-gray-500"
          >
            {ROLE_LABELS[role]}
            {REQUIRED_ROLES.includes(role) && (
              <span className="text-red-400 ml-0.5">*</span>
            )}
          </div>
        ))}
        <div className="ml-auto text-xs text-gray-500">状态</div>
      </div>

      {/* Rows */}
      {matrix.map(row => (
        <MatrixRowView
          key={row.groupKey}
          row={row}
          submitStatus={rowSubmitStatuses[row.groupKey]}
        />
      ))}

      {/* Stats bar */}
      <div className="flex items-center gap-4 py-2 px-3 bg-gray-50 text-xs text-gray-500">
        <span>
          就绪 <strong className="text-green-600">{readyCount}</strong>
        </span>
        <span>
          不完整 <strong className="text-orange-600">{incompleteCount}</strong>
        </span>
        {unassigned.length > 0 && (
          <span>
            未归类{' '}
            <strong className="text-gray-600">{unassigned.length}</strong>
          </span>
        )}
      </div>

      {/* Unassigned files */}
      {unassigned.length > 0 && (
        <div className="border-t border-gray-200 p-3">
          <p className="text-xs text-gray-500 mb-2">
            未归类文件（无法识别款号或角色）
          </p>
          <div className="flex flex-wrap gap-2">
            {unassigned.map(f => (
              <div key={f.id} className="relative group">
                <img
                  src={f.blobUrl}
                  alt={f.name}
                  className="w-12 h-12 object-cover rounded border border-gray-200 opacity-60"
                  title={f.name}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
