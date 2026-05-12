import { useEffect } from 'react';
import { Tag } from '@/components/Tag';
import { useTagsStore } from '@/store';

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
  const { businessLines, categories, loaded, loadError, loadTags } =
    useTagsStore();

  useEffect(() => {
    if (!loaded) loadTags();
  }, [loaded, loadTags]);

  return (
    <div className="space-y-3">
      {loadError && (
        <div className="text-xs text-red-600">标签加载失败：{loadError}</div>
      )}
      <div>
        <span className="text-xs text-gray-500 mb-1 block">品牌</span>
        <div className="flex flex-wrap gap-2">
          {businessLines.map(line => (
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
          {categories.map(cat => (
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
