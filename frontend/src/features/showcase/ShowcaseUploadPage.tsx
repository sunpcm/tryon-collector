import { useEffect, useMemo, useRef, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Banner } from '@/components/Banner';
import { Button, Input, ProgressBar, showToast } from '@/components';
import { useIdentityStore } from '@/store';
import { fetchBrands, submitShowcase } from '@/api';
import { uuid } from '@/utils';

interface PickedFile {
  id: string;
  file: File;
  preview: string;
  kind: 'image' | 'video';
}

interface ShowcaseUploadPageProps {
  lockedBrand?: string;
  title?: string;
}

const MAX_IMAGE_BYTES = 50 * 1024 * 1024;
const MAX_VIDEO_BYTES = 200 * 1024 * 1024;

function kindOf(file: File): 'image' | 'video' | null {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('video/')) return 'video';
  return null;
}

function sizeCap(file: File): number {
  return file.type.startsWith('video/') ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function ShowcaseUploadPage({
  lockedBrand,
  title = '展示图采集',
}: ShowcaseUploadPageProps = {}) {
  const { nickname } = useIdentityStore();
  const [files, setFiles] = useState<PickedFile[]>([]);
  const [brand, setBrand] = useState(lockedBrand ?? '');
  const [purpose, setPurpose] = useState('');
  const [brandOptions, setBrandOptions] = useState<string[]>([]);
  const [showBrandDropdown, setShowBrandDropdown] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const brandBoxRef = useRef<HTMLDivElement | null>(null);
  const isBrandLocked = !!lockedBrand;

  useEffect(() => {
    if (lockedBrand) setBrand(lockedBrand);
  }, [lockedBrand]);

  useEffect(() => {
    if (isBrandLocked) return;
    fetchBrands()
      .then(setBrandOptions)
      .catch(() => setBrandOptions([]));
  }, [isBrandLocked]);

  useEffect(() => {
    if (isBrandLocked) return;
    const onDocClick = (e: MouseEvent) => {
      if (
        brandBoxRef.current &&
        !brandBoxRef.current.contains(e.target as Node)
      ) {
        setShowBrandDropdown(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [isBrandLocked]);

  const filteredBrands = useMemo(() => {
    if (isBrandLocked) return [];
    const q = brand.trim().toLowerCase();
    if (!q) return brandOptions;
    return brandOptions.filter(b => b.toLowerCase().includes(q));
  }, [brand, brandOptions, isBrandLocked]);

  const onDrop = (accepted: File[]) => {
    const next: PickedFile[] = [];
    for (const f of accepted) {
      const k = kindOf(f);
      if (!k) {
        showToast(`不支持的文件类型: ${f.name}`, 'error');
        continue;
      }
      if (f.size > sizeCap(f)) {
        showToast(
          `${f.name} 超过上限（${k === 'video' ? '200MB' : '50MB'}）`,
          'error'
        );
        continue;
      }
      next.push({
        id: uuid(),
        file: f,
        preview: URL.createObjectURL(f),
        kind: k,
      });
    }
    setFiles(prev => [...prev, ...next]);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [], 'video/*': [] },
  });

  const removeFile = (id: string) => {
    setFiles(prev => {
      const victim = prev.find(f => f.id === id);
      if (victim) URL.revokeObjectURL(victim.preview);
      return prev.filter(f => f.id !== id);
    });
  };

  const canSubmit =
    !!nickname && brand.trim().length > 0 && files.length > 0 && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setProgress(10);
    try {
      const resp = await submitShowcase({
        uploader: nickname!,
        brand: brand.trim(),
        purpose: purpose.trim() || undefined,
        client_submit_id: uuid(),
        files: files.map(f => f.file),
      });
      setProgress(100);
      showToast(`提交成功：${resp.showcase_id.slice(0, 8)}...`, 'success');
      for (const f of files) URL.revokeObjectURL(f.preview);
      setFiles([]);
      if (!isBrandLocked) {
        setBrand('');
        fetchBrands()
          .then(setBrandOptions)
          .catch(() => {});
      }
      setPurpose('');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(`提交失败：${msg}`, 'error');
    } finally {
      setSubmitting(false);
      setTimeout(() => setProgress(0), 1500);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Banner />
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <h1 className="text-2xl font-bold text-gray-800">{title}</h1>
        <p className="text-sm text-gray-500">
          上传用于展示的图片或视频。一次可上传一批。
        </p>

        <section className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div ref={brandBoxRef} className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                品牌 <span className="text-red-500">*</span>
              </label>
              {isBrandLocked ? (
                <Input size="md" value={brand} disabled readOnly />
              ) : (
                <Input
                  size="md"
                  placeholder="输入或选择品牌"
                  value={brand}
                  onChange={e => {
                    setBrand(e.target.value);
                    setShowBrandDropdown(true);
                  }}
                  onFocus={() => setShowBrandDropdown(true)}
                />
              )}
              {!isBrandLocked &&
                showBrandDropdown &&
                filteredBrands.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-auto z-10">
                    {filteredBrands.map(b => (
                      <button
                        key={b}
                        type="button"
                        className="w-full text-left px-3 py-1.5 text-sm hover:bg-blue-50"
                        onMouseDown={e => {
                          e.preventDefault();
                          setBrand(b);
                          setShowBrandDropdown(false);
                        }}
                      >
                        {b}
                      </button>
                    ))}
                  </div>
                )}
              <p className="text-xs text-gray-400 mt-1">
                {isBrandLocked
                  ? '当前入口已锁定品牌，如需切换请返回首页重新选择'
                  : '历史品牌会自动记住，下次输入时下拉可选'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                用途 <span className="text-gray-400 text-xs">（选填）</span>
              </label>
              <Input
                size="md"
                placeholder="例如：春季首页 banner"
                value={purpose}
                onChange={e => setPurpose(e.target.value)}
                maxLength={200}
              />
            </div>
          </div>

          <div className="text-xs text-gray-500 flex gap-4">
            <span>上传人：{nickname ?? '（未设置花名）'}</span>
            <span>上传时间：提交时自动记录</span>
          </div>
        </section>

        <section className="bg-white rounded-lg border border-gray-200 p-4">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive
                ? 'border-blue-400 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <input {...getInputProps()} />
            <p className="text-3xl text-gray-300">+</p>
            <p className="text-sm text-gray-600 mt-2">
              拖入或点击选择图片 / 视频
            </p>
            <p className="text-xs text-gray-400 mt-1">
              图片 ≤ 50MB · 视频 ≤ 200MB · 支持 JPG/PNG/WebP/GIF
              等图片，MP4/WebM/MOV 等视频
            </p>
          </div>

          {files.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mt-4">
              {files.map(f => (
                <div
                  key={f.id}
                  className="relative border border-gray-200 rounded-md overflow-hidden group"
                >
                  {f.kind === 'image' ? (
                    <img
                      src={f.preview}
                      alt={f.file.name}
                      className="w-full h-28 object-cover"
                    />
                  ) : (
                    <video
                      src={f.preview}
                      className="w-full h-28 object-cover"
                      muted
                    />
                  )}
                  <div className="absolute bottom-0 inset-x-0 bg-black/50 text-white text-[10px] px-1.5 py-0.5 truncate">
                    {f.file.name} · {formatBytes(f.file.size)}
                  </div>
                  <button
                    onClick={() => removeFile(f.id)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ×
                  </button>
                  {f.kind === 'video' && (
                    <div className="absolute top-1 left-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">
                      视频
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {progress > 0 && <ProgressBar value={progress} />}

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">
            已选 {files.length} 个文件
          </span>
          <Button
            variant="primary"
            size="lg"
            disabled={!canSubmit}
            onClick={handleSubmit}
          >
            {submitting ? '提交中...' : '提交展示图'}
          </Button>
        </div>
      </div>
    </div>
  );
}
