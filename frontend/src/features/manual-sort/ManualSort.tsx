import { RoleBox } from './RoleBox';
import { ROLES } from '@/types';

export function ManualSort() {
  return (
    <div className="grid grid-cols-4 gap-4">
      {ROLES.map(role => (
        <RoleBox key={role} role={role} />
      ))}
    </div>
  );
}
