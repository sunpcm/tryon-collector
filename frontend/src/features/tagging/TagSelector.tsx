import { Tag } from '@/components/Tag';
import { VALID_BUSINESS_LINES, VALID_CATEGORIES } from '@/config';

interface TagSelectorProps {
  businessLine: string | null;
  category: string | null;
  onBusinessLineChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
}

export function TagSelector({
  businessLine,
  category,
  onBusinessLineChange,
  onCategoryChange,
}: TagSelectorProps) {
  return (
    <div className="space-y-3">
      <div>
        <span className="text-xs text-gray-500 mb-1 block">业务线</span>
        <div className="flex flex-wrap gap-2">
          {VALID_BUSINESS_LINES.map(line => (
            <Tag
              key={line}
              label={line}
              selected={businessLine === line}
              onClick={() => onBusinessLineChange(line)}
            />
          ))}
        </div>
      </div>
      <div>
        <span className="text-xs text-gray-500 mb-1 block">品类</span>
        <div className="flex flex-wrap gap-2">
          {VALID_CATEGORIES.map(cat => (
            <Tag
              key={cat}
              label={cat}
              selected={category === cat}
              onClick={() => onCategoryChange(cat)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
