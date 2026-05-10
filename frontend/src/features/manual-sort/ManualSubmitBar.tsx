import { useState, useCallback } from 'react';
import { useMatrixStore, useIdentityStore } from '@/store';
import { submitBundlesBatch, buildFileFieldName } from '@/api';
import { showToast } from '@/components/Toast';
import { ProgressBar } from '@/components/ProgressBar';
import { incrementSubmitCount } from '@/features/gamification';
import { REQUIRED_ROLES } from '@/types';
import type { BundleMeta, Role } from '@/types';

interface ManualSubmitBarProps {
  businessLine: string;
  category: string;
}

export function ManualSubmitBar({
  businessLine,
  category,
}: ManualSubmitBarProps) {
  const manualFiles = useMatrixStore(s => s.manualFiles);
  const isManualReady = useMatrixStore(s => s.isManualReady);
  const clearManual = useMatrixStore(s => s.clearManual);
  const { nickname } = useIdentityStore();
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);

  const ready = isManualReady();

  const handleSubmit = useCallback(async () => {
    if (!ready || !nickname || submitting) return;

    setSubmitting(true);
    setProgress(0);

    const groupKey = crypto.randomUUID();
    const clientSubmitId = crypto.randomUUID();

    const resolveFile = async (f: (typeof manualFiles)[Role][number]): Promise<File> =>
      f.file ??
      fetch(f.blobUrl)
        .then(r => r.blob())
        .then(blob => new File([blob], f.name, { type: f.type }));

    // Build one bundle with all files per role as arrays
    const filesRecord: Record<Role, string[]> = {} as Record<Role, string[]>;
    const fileMap: Record<string, File> = {};

    for (const role of [...REQUIRED_ROLES, 'annotated' as const]) {
      const roleFiles = manualFiles[role];
      if (roleFiles.length === 0) continue;
      const fieldNames: string[] = [];
      for (let i = 0; i < roleFiles.length; i++) {
        const fieldName = buildFileFieldName(`${groupKey}_${i}`, role);
        fieldNames.push(fieldName);
        fileMap[fieldName] = await resolveFile(roleFiles[i]);
      }
      filesRecord[role] = fieldNames;
    }

    const bundles: BundleMeta[] = [{ group_key: groupKey, files: filesRecord }];

    try {
      const response = await submitBundlesBatch({
        designer_id: nickname,
        business_line: businessLine,
        category,
        client_submit_id: clientSubmitId,
        bundles,
        files: fileMap,
      });

      if (response.rejected.length === 0) {
        showToast(
          `提交成功（${response.accepted.length} 个任务包）`,
          'success'
        );
        incrementSubmitCount(response.accepted.length);
        window.dispatchEvent(new Event('submit-count-changed'));
        clearManual();
      } else {
        showToast(
          `${response.accepted.length} 成功，${response.rejected.length} 失败`,
          'warning'
        );
      }
    } catch (err) {
      showToast(
        `提交失败: ${err instanceof Error ? err.message : '未知错误'}`,
        'error'
      );
    } finally {
      setSubmitting(false);
      setProgress(100);
    }
  }, [
    ready,
    nickname,
    submitting,
    manualFiles,
    businessLine,
    category,
    clearManual,
  ]);

  const totalCount =
    manualFiles.product.length +
    manualFiles.tryon.length +
    manualFiles.retouched.length +
    manualFiles.annotated.length;

  if (totalCount === 0) return null;

  return (
    <div className="flex items-center gap-4 py-3">
      {submitting && (
        <div className="flex-1">
          <ProgressBar value={progress} showLabel />
        </div>
      )}
      <button
        data-testid="submit-btn"
        disabled={!ready || !nickname || submitting}
        onClick={handleSubmit}
        className={`px-6 py-2 rounded-md font-medium text-sm transition-colors ${
          ready && nickname && !submitting
            ? 'bg-blue-500 text-white hover:bg-blue-600'
            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
        }`}
      >
        {submitting ? '提交中...' : '提交'}
      </button>
      <button
        onClick={clearManual}
        className="text-sm text-gray-400 hover:text-red-500"
      >
        清空
      </button>
      {!ready && totalCount > 0 && (
        <span className="text-xs text-gray-400">
          需要产品图、试穿图、精修图各至少 1 张
        </span>
      )}
    </div>
  );
}
