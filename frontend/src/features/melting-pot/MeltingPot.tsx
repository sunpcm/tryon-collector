import { useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { useMatrixStore, useClusterConfigStore } from '@/store';
import { cluster } from '@/features/clustering';
import { ROLES } from '@/types';
import type { FileMeta, Role } from '@/types';

let fileIdCounter = 0;

function fileToFileMeta(file: File): FileMeta {
  return {
    id: `file-${++fileIdCounter}-${Date.now()}`,
    name: file.name,
    size: file.size,
    type: file.type,
    blobUrl: URL.createObjectURL(file),
    file,
  };
}

interface MeltingPotProps {
  children: React.ReactNode;
}

export function MeltingPot({ children }: MeltingPotProps) {
  const { files, addFiles, setClusterResult, setCellFile } = useMatrixStore();
  const clusterConfig = useClusterConfigStore(s => s.config);

  const processFiles = useCallback(
    (newFiles: File[]) => {
      const metas = newFiles
        .filter(f => f.type.startsWith('image/'))
        .map(fileToFileMeta);

      if (metas.length === 0) return;

      const allFiles = [...files, ...metas];
      addFiles(metas);
      const result = cluster(allFiles, clusterConfig);
      setClusterResult(result);
    },
    [files, addFiles, setClusterResult, clusterConfig]
  );

  const onDrop = useCallback(
    (accepted: File[]) => {
      processFiles(accepted);
    },
    [processFiles]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp'] },
    noClick: true,
    noKeyboard: true,
  });

  // Handle paste (Ctrl/Cmd+V)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      const imageFiles: File[] = [];
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) imageFiles.push(file);
        }
      }

      if (imageFiles.length === 0) return;
      e.preventDefault();

      // Route to selected cell if one is active
      const selected = useMatrixStore.getState().selectedCell;
      if (selected && imageFiles.length > 0) {
        const meta = fileToFileMeta(imageFiles[0]);
        setCellFile(selected.groupKey, selected.role, meta);
        return;
      }

      processFiles(imageFiles);
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [processFiles, setCellFile]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if typing in an input/textarea
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      const store = useMatrixStore.getState();

      if (e.key === 'Enter') {
        e.preventDefault();
        const btn = document.querySelector<HTMLButtonElement>(
          '[data-testid="submit-btn"]'
        );
        if (btn && !btn.disabled) btn.click();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        store.clearUnassigned();
        store.setSelectedCell(null);
      } else if (e.key >= '1' && e.key <= '4') {
        const selected = store.selectedCell;
        if (!selected) return;
        e.preventDefault();
        const roleIndex = parseInt(e.key) - 1;
        const role = ROLES[roleIndex] as Role;
        store.setSelectedCell({ groupKey: selected.groupKey, role });
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div {...getRootProps()} className="relative min-h-screen">
      <input {...getInputProps()} />
      {isDragActive && (
        <div className="fixed inset-0 z-50 bg-blue-500/10 border-4 border-dashed border-blue-400 rounded-lg flex items-center justify-center pointer-events-none">
          <div className="bg-white rounded-xl px-8 py-4 shadow-lg">
            <p className="text-lg font-medium text-blue-600">松开以添加图片</p>
            <p className="text-sm text-gray-500 mt-1">支持 JPG / PNG / WebP</p>
          </div>
        </div>
      )}
      {children}
    </div>
  );
}
