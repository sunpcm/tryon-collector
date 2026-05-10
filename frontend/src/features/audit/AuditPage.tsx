import { useState, useEffect, useCallback } from 'react';
import { Banner } from '@/components/Banner';
import { fetchAuditBundles } from '@/api';
import type { AuditBundle } from '@/api';

const PAGE_SIZE = 20;

export function AuditPage() {
  const [bundles, setBundles] = useState<AuditBundle[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [designerFilter, setDesignerFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await fetchAuditBundles({
        designer_id: designerFilter || undefined,
        category: categoryFilter || undefined,
        limit: PAGE_SIZE,
        offset,
      });
      setBundles(resp.bundles);
      setTotal(resp.total);
    } catch (err) {
      console.error('Audit fetch failed:', err);
    } finally {
      setLoading(false);
    }
  }, [designerFilter, categoryFilter, offset]);

  useEffect(() => {
    load();
  }, [load]);

  const handleFilterChange = () => {
    setOffset(0);
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  return (
    <div className="min-h-screen bg-gray-50">
      <Banner />
      <div className="max-w-6xl mx-auto p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">审计页</h1>

        {/* Filters */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4 flex gap-4 items-end">
          <div>
            <label className="block text-xs text-gray-500 mb-1">花名</label>
            <input
              type="text"
              value={designerFilter}
              onChange={e => {
                setDesignerFilter(e.target.value);
                handleFilterChange();
              }}
              placeholder="筛选花名..."
              className="px-3 py-1.5 border border-gray-300 rounded text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">品类</label>
            <input
              type="text"
              value={categoryFilter}
              onChange={e => {
                setCategoryFilter(e.target.value);
                handleFilterChange();
              }}
              placeholder="筛选品类..."
              className="px-3 py-1.5 border border-gray-300 rounded text-sm"
            />
          </div>
          <button
            onClick={load}
            className="px-4 py-1.5 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
          >
            刷新
          </button>
          <span className="text-sm text-gray-500 ml-auto">
            共 {total} 条记录
          </span>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                  款号
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                  花名
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                  品类
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                  业务线
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                  上传时间
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                  文件数
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                  存储目录
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-gray-400"
                  >
                    加载中...
                  </td>
                </tr>
              ) : bundles.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-gray-400"
                  >
                    暂无数据
                  </td>
                </tr>
              ) : (
                bundles.map(b => (
                  <tr key={b.task_id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-mono text-xs">
                      {b.group_key}
                    </td>
                    <td className="px-4 py-2">{b.designer_id}</td>
                    <td className="px-4 py-2">{b.category}</td>
                    <td className="px-4 py-2">{b.business_line}</td>
                    <td className="px-4 py-2 text-xs text-gray-500">
                      {new Date(b.upload_time).toLocaleString('zh-CN')}
                    </td>
                    <td className="px-4 py-2 text-xs">
                      {Object.values(b.files).reduce((s, arr) => s + arr.length, 0)}
                      {b.has_annotation && (
                        <span className="ml-1 text-blue-500">(含标注)</span>
                      )}
                    </td>
                    <td className="px-4 py-2 font-mono text-xs text-gray-400">
                      {b.task_id}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <button
              disabled={offset === 0}
              onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
              className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50"
            >
              上一页
            </button>
            <span className="text-sm text-gray-500">
              第 {currentPage} / {totalPages} 页
            </span>
            <button
              disabled={offset + PAGE_SIZE >= total}
              onClick={() => setOffset(offset + PAGE_SIZE)}
              className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50"
            >
              下一页
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
