import { RoleBox } from './RoleBox';
import { ROLES } from '@/types';

interface ManualSortProps {
  onSwitchMode: () => void;
}

export function ManualSort({ onSwitchMode }: ManualSortProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        {ROLES.map(role => (
          <RoleBox key={role} role={role} />
        ))}
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onSwitchMode}
          className="text-sm text-gray-400 hover:text-blue-500"
        >
          切换自动聚类 ▶
        </button>
      </div>
    </div>
  );
}
