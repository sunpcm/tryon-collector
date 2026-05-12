import { useState, useEffect, useCallback } from 'react';
import { Banner } from '@/components/Banner';
import { Button, Modal, showToast } from '@/components';
import { fetchAuditBundles, deleteBundle, type AuditBundle } from '@/api';
import { useIdentityStore } from '@/store';

const PAGE_SIZE = 20;

export function AuditPage() {
  const { nickname } = useIdentityStore();

  const [bundles, setBundles] = useState<AuditBundle[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [showAll, setShowAll] = useState(false);
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState<AuditBundle | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await fetchAuditBundles({
        designer_id: showAll ? undefined : (nickname ?? '__none__'),
        category: categoryFilter || undefined,
        include_deleted: includeDeleted,
        limit: PAGE_SIZE,
        offset,
      });
      setBundles(resp.bundles);
      setTotal(resp.total);
    } catch (err) {
      console.error('Audit fetch failed:', err);
      showToast('加载失败', 'error');
    } finally {
      setLoading(false);
    }
  }, [showAll, nickname, categoryFilter, includeDeleted, offset]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  const handleDelete = async (b: AuditBundle) => {
    try {
      await deleteBundle(b.task_id, nickname ?? undefined);
      showToast('已删除', 'success');
      setConfirming(null);
      load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(`删除失败：${msg}`, 'error');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Banner />
      <div className="max-w-6xl mx-auto p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">审计页</h1>

        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4 flex gap-4 items-center flex-wrap">
          <label className="flex items-center gap-1.5 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={showAll}
              onChange={e => {
                setShowAll(e.target.checked);
                setOffset(0);
              }}
            />
            看所有人的（默认仅看自己）
          </label>
          <label className="flex items-center gap-1.5 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={includeDeleted}
              onChange={e => {
                setIncludeDeleted(e.target.checked);
                setOffset(0);
              }}
            />
            显示已删除
          </label>
          <div>
            <label className="block text-xs text-gray-500 mb-1">品类</label>
            <input
              type="text"
              value={categoryFilter}
              onChange={e => {
                setCategoryFilter(e.target.value);
                setOffset(0);
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
            {!showAll && nickname && (
              <span className="text-gray-400">（{nickname}）</span>
            )}
          </span>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                  款号
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                  标题
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                  花名
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                  品类
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                  品牌
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                  上传时间
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                  文件数
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                  存储目录
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-8 text-center text-gray-400"
                  >
                    加载中...
                  </td>
                </tr>
              ) : bundles.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-8 text-center text-gray-400"
                  >
                    暂无数据
                  </td>
                </tr>
              ) : (
                bundles.map(b => {
                  const isMine = !!nickname && b.designer_id === nickname;
                  const isDeleted = !!b.deleted_at;
                  return (
                    <tr
                      key={b.task_id}
                      className={`hover:bg-gray-50 ${isDeleted ? 'opacity-50' : ''}`}
                    >
                      <td className="px-3 py-2 font-mono text-xs">
                        {b.group_key}
                      </td>
                      <td className="px-3 py-2 text-xs">
                        {b.title || '—'}
                        {isDeleted && (
                          <span className="ml-1 text-red-500">[已删除]</span>
                        )}
                      </td>
                      <td className="px-3 py-2">{b.designer_id}</td>
                      <td className="px-3 py-2">{b.category}</td>
                      <td className="px-3 py-2">{b.business_line}</td>
                      <td className="px-3 py-2 text-xs text-gray-500">
                        {new Date(b.upload_time).toLocaleString('zh-CN')}
                      </td>
                      <td className="px-3 py-2 text-xs">
                        {Object.values(b.files).reduce(
                          (s, arr) => s + arr.length,
                          0
                        )}
                        {b.has_annotation && (
                          <span className="ml-1 text-blue-500">(含标注)</span>
                        )}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs text-gray-400">
                        {b.task_id.slice(0, 8)}...
                      </td>
                      <td className="px-3 py-2 text-xs">
                        {isDeleted ? (
                          <span className="text-gray-400">—</span>
                        ) : isMine ? (
                          <button
                            onClick={() => setConfirming(b)}
                            className="text-red-500 hover:text-red-700"
                          >
                            删除
                          </button>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

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

      <Modal
        open={!!confirming}
        title="确认删除"
        onClose={() => setConfirming(null)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirming(null)}>
              取消
            </Button>
            <button
              onClick={() => confirming && handleDelete(confirming)}
              className="px-4 py-2 rounded-md font-medium text-sm bg-red-500 text-white hover:bg-red-600"
            >
              确认删除
            </button>
          </>
        }
      >
        {confirming && (
          <div className="text-sm text-gray-700 space-y-2">
            <p>
              将软删以下任务包，可在"显示已删除"中查看，但不会再出现在常规列表里。
            </p>
            <p className="font-mono text-xs bg-gray-50 p-2 rounded">
              款号 {confirming.group_key} · {confirming.title || '（无标题）'}
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}
