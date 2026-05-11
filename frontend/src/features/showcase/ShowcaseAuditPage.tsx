import { useCallback, useEffect, useState } from 'react';
import { Banner } from '@/components/Banner';
import { fetchShowcases } from '@/api';
import type { Showcase } from '@/api';

const PAGE_SIZE = 20;

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function ShowcaseAuditPage() {
  const [rows, setRows] = useState<Showcase[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [uploaderFilter, setUploaderFilter] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await fetchShowcases({
        uploader: uploaderFilter || undefined,
        brand: brandFilter || undefined,
        limit: PAGE_SIZE,
        offset,
      });
      setRows(resp.showcases);
      setTotal(resp.total);
    } catch (err) {
      console.error('Showcases fetch failed:', err);
    } finally {
      setLoading(false);
    }
  }, [uploaderFilter, brandFilter, offset]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  return (
    <div className="min-h-screen bg-gray-50">
      <Banner />
      <div className="max-w-6xl mx-auto p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">展示图查看</h1>

        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4 flex gap-4 items-end">
          <div>
            <label className="block text-xs text-gray-500 mb-1">上传人</label>
            <input
              type="text"
              value={uploaderFilter}
              onChange={e => {
                setUploaderFilter(e.target.value);
                setOffset(0);
              }}
              placeholder="筛选花名..."
              className="px-3 py-1.5 border border-gray-300 rounded text-sm"
            />
          </div>
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
          <span className="text-sm text-gray-500 ml-auto">共 {total} 条</span>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                  品牌
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                  用途
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                  上传人
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                  上传时间
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                  文件数
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                  总大小
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                  存储 ID
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
              ) : rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
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
                  return (
                    <tr key={s.showcase_id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 font-medium">{s.brand}</td>
                      <td className="px-4 py-2 text-gray-600">
                        {s.purpose || '—'}
                      </td>
                      <td className="px-4 py-2">{s.uploader}</td>
                      <td className="px-4 py-2 text-xs text-gray-500">
                        {new Date(s.upload_time).toLocaleString('zh-CN')}
                      </td>
                      <td className="px-4 py-2 text-xs">
                        {imageCount > 0 && <span>{imageCount} 图</span>}
                        {imageCount > 0 && videoCount > 0 && <span> · </span>}
                        {videoCount > 0 && (
                          <span className="text-blue-500">
                            {videoCount} 视频
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-xs text-gray-500">
                        {formatBytes(totalBytes)}
                      </td>
                      <td className="px-4 py-2 font-mono text-xs text-gray-400">
                        {s.showcase_id}
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
    </div>
  );
}
