import { useState, useEffect, useCallback } from 'react';
import { Banner } from '@/components/Banner';
import { fetchTags, updateTags, type TagsConfig } from '@/api/client';
import { useTagsStore } from '@/store';

export function TagManager() {
  const [businessLines, setBusinessLines] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [newBusinessLine, setNewBusinessLine] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: 'ok' | 'err';
    text: string;
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const tags: TagsConfig = await fetchTags();
      setBusinessLines(tags.business_lines);
      setCategories(tags.categories);
    } catch {
      setMessage({ type: 'err', text: '加载标签失败' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await updateTags({ business_lines: businessLines, categories });
      await useTagsStore.getState().loadTags(true);
      setMessage({ type: 'ok', text: '保存成功' });
    } catch (e) {
      setMessage({
        type: 'err',
        text: e instanceof Error ? e.message : '保存失败',
      });
    } finally {
      setSaving(false);
    }
  };

  const removeBusinessLine = (item: string) => {
    setBusinessLines(prev => prev.filter(x => x !== item));
  };

  const removeCategory = (item: string) => {
    setCategories(prev => prev.filter(x => x !== item));
  };

  const addBusinessLine = () => {
    const val = newBusinessLine.trim();
    if (val && !businessLines.includes(val)) {
      setBusinessLines(prev => [...prev, val]);
      setNewBusinessLine('');
    }
  };

  const addCategory = () => {
    const val = newCategory.trim();
    if (val && !categories.includes(val)) {
      setCategories(prev => [...prev, val]);
      setNewCategory('');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Banner />
        <div className="max-w-2xl mx-auto text-center text-gray-400 py-20 p-6">
          加载中...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Banner />
      <div className="max-w-2xl mx-auto p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">标签管理</h1>

        {/* Business Lines */}
        <section className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
          <h2 className="text-sm font-medium text-gray-700 mb-3">品牌</h2>
          <div className="flex flex-wrap gap-2 mb-3">
            {businessLines.map(item => (
              <span
                key={item}
                className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm"
              >
                {item}
                <button
                  onClick={() => removeBusinessLine(item)}
                  className="ml-1 text-blue-400 hover:text-red-500"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newBusinessLine}
              onChange={e => setNewBusinessLine(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addBusinessLine()}
              placeholder="输入新品牌..."
              className="flex-1 px-3 py-1.5 border border-gray-300 rounded text-sm"
            />
            <button
              onClick={addBusinessLine}
              className="px-3 py-1.5 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
            >
              添加
            </button>
          </div>
        </section>

        {/* Categories */}
        <section className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
          <h2 className="text-sm font-medium text-gray-700 mb-3">品类</h2>
          <div className="flex flex-wrap gap-2 mb-3">
            {categories.map(item => (
              <span
                key={item}
                className="inline-flex items-center gap-1 px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm"
              >
                {item}
                <button
                  onClick={() => removeCategory(item)}
                  className="ml-1 text-green-400 hover:text-red-500"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newCategory}
              onChange={e => setNewCategory(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addCategory()}
              placeholder="输入新品类..."
              className="flex-1 px-3 py-1.5 border border-gray-300 rounded text-sm"
            />
            <button
              onClick={addCategory}
              className="px-3 py-1.5 bg-green-500 text-white rounded text-sm hover:bg-green-600"
            >
              添加
            </button>
          </div>
        </section>

        {/* Save */}
        <div className="flex items-center gap-4">
          <button
            onClick={save}
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? '保存中...' : '保存'}
          </button>
          <button
            onClick={load}
            className="px-4 py-2 border border-gray-300 rounded text-sm text-gray-600 hover:bg-gray-50"
          >
            重置
          </button>
          {message && (
            <span
              className={`text-sm ${message.type === 'ok' ? 'text-green-600' : 'text-red-600'}`}
            >
              {message.text}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
