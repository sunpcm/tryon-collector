import type { MatrixRow as MatrixRowType, RowSubmitStatus } from '@/types';
import { ROLES, ROLE_LABELS, REQUIRED_ROLES } from '@/types';
import { MatrixCellView } from './MatrixCell';
import { cn } from '@/utils';

interface MatrixRowProps {
  row: MatrixRowType;
  submitStatus?: RowSubmitStatus;
}

const statusConfig = {
  ready: { label: '就绪', color: 'text-green-600 bg-green-50' },
  incomplete: { label: '不完整', color: 'text-orange-600 bg-orange-50' },
  overflow: { label: '多余', color: 'text-yellow-600 bg-yellow-50' },
};

const submitStatusConfig: Record<
  RowSubmitStatus,
  { label: string; color: string }
> = {
  pending: { label: '待提交', color: 'text-gray-500' },
  uploading: { label: '上传中...', color: 'text-blue-500' },
  accepted: { label: '已接受', color: 'text-green-600' },
  rejected: { label: '已拒绝', color: 'text-red-600' },
};

export function MatrixRowView({ row, submitStatus }: MatrixRowProps) {
  const config = statusConfig[row.status];

  return (
    <div className="flex items-center gap-3 py-2 px-3 border-b border-gray-100 hover:bg-gray-50">
      {/* Group Key */}
      <div
        className="w-28 font-mono text-sm font-medium text-gray-700 truncate"
        title={row.groupKey}
      >
        {row.groupKey}
      </div>

      {/* Role Cells */}
      {ROLES.map(role => (
        <div key={role} className="flex flex-col items-center gap-1">
          <span className="text-xs text-gray-400">
            {ROLE_LABELS[role]}
            {REQUIRED_ROLES.includes(role) && (
              <span className="text-red-400 ml-0.5">*</span>
            )}
          </span>
          <MatrixCellView
            role={role}
            cell={row.cells[role]}
            groupKey={row.groupKey}
          />
        </div>
      ))}

      {/* Status Badge */}
      <div className="ml-auto">
        {submitStatus ? (
          <span
            className={cn(
              'text-xs font-medium',
              submitStatusConfig[submitStatus].color
            )}
          >
            {submitStatusConfig[submitStatus].label}
          </span>
        ) : (
          <span
            className={cn(
              'text-xs font-medium px-2 py-0.5 rounded-full',
              config.color
            )}
          >
            {config.label}
          </span>
        )}
      </div>
    </div>
  );
}
