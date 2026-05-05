import { useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { useMatrixStore } from '@/store';
import { cluster } from '@/features/clustering';
import type { FileMeta } from '@/types';

let fileIdCounter = 0;

function fileToFileMeta(file: File): FileMeta {
  return {
    id: `file-${++fileIdCounter}-${Date.now()}`,
    name: file.name,
    size: file.size,
    type: file.type,
    blobUrl: URL.createObjectURL(file),
  };
}

interface MeltingPotProps {
  children: React.ReactNode;
}

export function MeltingPot({ children }: MeltingPotProps) {
  const { files, addFiles, setClusterResult } = useMatrixStore();

  const processFiles = useCallback(
    (newFiles: File[]) => {
      const metas = newFiles
        .filter(f => f.type.startsWith('image/'))
        .map(fileToFileMeta);

      if (metas.length === 0) return;

      const allFiles = [...files, ...metas];
      addFiles(metas);
      const result = cluster(allFiles);
      setClusterResult(result);
    },
    [files, addFiles, setClusterResult]
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

      if (imageFiles.length > 0) {
        e.preventDefault();
        processFiles(imageFiles);
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [processFiles]);

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
