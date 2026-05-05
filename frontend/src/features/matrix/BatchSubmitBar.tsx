import { useState, useCallback } from 'react';
import { useMatrixStore, useIdentityStore } from '@/store';
import { submitBundlesBatch, buildFileFieldName } from '@/api';
import { showToast } from '@/components/Toast';
import { ProgressBar } from '@/components/ProgressBar';
import { REQUIRED_ROLES } from '@/types';
import type { BundleMeta, Role } from '@/types';

interface BatchSubmitBarProps {
  businessLine: string;
  category: string;
}

export function BatchSubmitBar({
  businessLine,
  category,
}: BatchSubmitBarProps) {
  const { matrix, isAllReady, setRowSubmitStatus, clearAll, files } =
    useMatrixStore();
  const { nickname } = useIdentityStore();
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);

  const allReady = isAllReady();

  const handleSubmit = useCallback(async () => {
    if (!allReady || !nickname || submitting) return;

    setSubmitting(true);
    setProgress(0);

    const readyRows = matrix.filter(r => r.status === 'ready');
    const clientSubmitId = crypto.randomUUID();

    // Build bundles and file map
    const bundles: BundleMeta[] = [];
    const fileMap: Record<string, File> = {};

    for (const row of readyRows) {
      const filesRecord: Record<Role, string> = {} as Record<Role, string>;
      for (const role of REQUIRED_ROLES) {
        const main = row.cells[role].main;
        if (main) {
          const fieldName = buildFileFieldName(row.groupKey, role);
          filesRecord[role] = fieldName;
          // Find the original File from blobUrl — we store FileMeta but need File for upload
          // For now, we'll need to fetch from blobUrl
          const blob = await fetch(main.blobUrl).then(r => r.blob());
          const file = new File([blob], main.name, { type: main.type });
          fileMap[fieldName] = file;
        }
      }
      bundles.push({ group_key: row.groupKey, files: filesRecord });
      setRowSubmitStatus(row.groupKey, 'uploading');
    }

    try {
      const response = await submitBundlesBatch({
        designer_id: nickname,
        business_line: businessLine,
        category,
        client_submit_id: clientSubmitId,
        bundles,
        files: fileMap,
      });

      // Update statuses based on response
      for (const accepted of response.accepted) {
        setRowSubmitStatus(accepted.group_key, 'accepted');
      }
      for (const rejected of response.rejected) {
        setRowSubmitStatus(rejected.group_key, 'rejected');
      }

      if (response.rejected.length === 0) {
        showToast(
          `全部 ${response.accepted.length} 个任务包提交成功`,
          'success'
        );
        // Revoke all ObjectURLs
        for (const f of files) {
          URL.revokeObjectURL(f.blobUrl);
        }
        clearAll();
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
      // Reset uploading statuses back to pending
      for (const row of readyRows) {
        setRowSubmitStatus(row.groupKey, 'pending');
      }
    } finally {
      setSubmitting(false);
      setProgress(100);
    }
  }, [
    allReady,
    nickname,
    submitting,
    matrix,
    businessLine,
    category,
    files,
    setRowSubmitStatus,
    clearAll,
  ]);

  if (matrix.length === 0) return null;

  return (
    <div className="flex items-center gap-4 py-3">
      {submitting && (
        <div className="flex-1">
          <ProgressBar value={progress} showLabel />
        </div>
      )}
      <button
        disabled={!allReady || !nickname || submitting}
        onClick={handleSubmit}
        className={`px-6 py-2 rounded-md font-medium text-sm transition-colors ${
          allReady && nickname && !submitting
            ? 'bg-blue-500 text-white hover:bg-blue-600'
            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
        }`}
      >
        {submitting ? '提交中...' : '一键批量提交'}
      </button>
    </div>
  );
}
