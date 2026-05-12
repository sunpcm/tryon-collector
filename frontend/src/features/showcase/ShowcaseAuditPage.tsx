import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Banner } from '@/components/Banner';
import { Button, Modal, showToast } from '@/components';
import { fetchShowcases, deleteShowcase } from '@/api';
import type { Showcase } from '@/api';
import { useIdentityStore, useEditingStore } from '@/store';

const PAGE_SIZE = 20;

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function ShowcaseAuditPage() {
  const { nickname } = useIdentityStore();
  const setEditingShowcase = useEditingStore(s => s.setShowcase);
  const [, navigate] = useLocation();

  const [rows, setRows] = useState<Showcase[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [showAll, setShowAll] = useState(false);
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [brandFilter, setBrandFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState<Showcase | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await fetchShowcases({
        uploader: showAll ? undefined : (nickname ?? '__none__'),
        brand: brandFilter || undefined,
        include_deleted: includeDeleted,
        limit: PAGE_SIZE,
        offset,
      });
      setRows(resp.showcases);
      setTotal(resp.total);
    } catch (err) {
      console.error('Showcases fetch failed:', err);
      showToast('加载失败', 'error');
    } finally {
      setLoading(false);
    }
  }, [showAll, nickname, brandFilter, includeDeleted, offset]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  const handleEdit = (s: Showcase) => {
    setEditingShowcase({
      showcase_id: s.showcase_id,
      uploader: s.uploader,
      brand: s.brand,
      purpose: s.purpose,
    });
    if (s.brand === 'monologue') navigate('/showcase/monologue');
    else if (s.brand === '老凤祥') navigate('/showcase/laofengxiang');
    else navigate('/showcase');
  };

  const handleDelete = async (s: Showcase) => {
    try {
      await deleteShowcase(s.showcase_id, nickname ?? undefined);
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
        <h1 className="text-2xl font-bold text-gray-800 mb-6">展示图查看</h1>

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
            <label className="block text-xs text-gray-500 mb-1">品牌</label>
            <input
              type="text"
              value={brandFilter}
              onChange={e => {
                setBrandFilter(e.target.value);
                setOffset(0);
              }}
              placeholder="筛选品牌..."
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
            共 {total} 条
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
                  品牌
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                  用途
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                  上传人
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                  上传时间
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                  文件数
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                  总大小
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                  存储 ID
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
                    colSpan={8}
                    className="px-4 py-8 text-center text-gray-400"
                  >
                    加载中...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-8 text-center text-gray-400"
                  >
                    暂无数据
                  </td>
                </tr>
              ) : (
                rows.map(s => {
                  const imageCount = s.files.filter(
                    f => f.kind === 'image'
                  ).length;
                  const videoCount = s.files.filter(
                    f => f.kind === 'video'
                  ).length;
                  const totalBytes = s.files.reduce(
                    (sum, f) => sum + f.bytes,
                    0
                  );
                  const isMine = !!nickname && s.uploader === nickname;
                  const isDeleted = !!s.deleted_at;
                  return (
                    <tr
                      key={s.showcase_id}
                      className={`hover:bg-gray-50 ${isDeleted ? 'opacity-50' : ''}`}
                    >
                      <td className="px-3 py-2 font-medium">
                        {s.brand}
                        {isDeleted && (
                          <span className="ml-1 text-red-500 text-xs">
                            [已删除]
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-gray-600">
                        {s.purpose || '—'}
                      </td>
                      <td className="px-3 py-2">{s.uploader}</td>
                      <td className="px-3 py-2 text-xs text-gray-500">
                        {new Date(s.upload_time).toLocaleString('zh-CN')}
                      </td>
                      <td className="px-3 py-2 text-xs">
                        {imageCount > 0 && <span>{imageCount} 图</span>}
                        {imageCount > 0 && videoCount > 0 && <span> · </span>}
                        {videoCount > 0 && (
                          <span className="text-blue-500">
                            {videoCount} 视频
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-500">
                        {formatBytes(totalBytes)}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs text-gray-400">
                        {s.showcase_id.slice(0, 8)}...
                      </td>
                      <td className="px-3 py-2 text-xs">
                        {isDeleted ? (
                          <span className="text-gray-400">—</span>
                        ) : isMine ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEdit(s)}
                              className="text-blue-500 hover:text-blue-700"
                            >
                              编辑
                            </button>
                            <button
                              onClick={() => setConfirming(s)}
                              className="text-red-500 hover:text-red-700"
                            >
                              删除
                            </button>
                          </div>
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
              将软删以下展示图，可在"显示已删除"中查看，但不会再出现在常规列表里。
            </p>
            <p className="font-mono text-xs bg-gray-50 p-2 rounded">
              品牌 {confirming.brand} · {confirming.purpose || '（无用途）'}
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}
