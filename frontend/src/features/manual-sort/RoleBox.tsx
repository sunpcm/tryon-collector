import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import type { FileMeta, Role } from '@/types';
import { ROLE_LABELS } from '@/types';
import { useMatrixStore } from '@/store';

function fileToFileMeta(file: File): FileMeta {
  return {
    id: crypto.randomUUID(),
    name: file.name,
    size: file.size,
    type: file.type,
    blobUrl: URL.createObjectURL(file),
    file,
  };
}

interface RoleBoxProps {
  role: Role;
}

export function RoleBox({ role }: RoleBoxProps) {
  const files = useMatrixStore(s => s.manualFiles[role]);
  const addManualFiles = useMatrixStore(s => s.addManualFiles);
  const removeManualFile = useMatrixStore(s => s.removeManualFile);

  const onDrop = useCallback(
    (accepted: File[]) => {
      const images = accepted.filter(f => f.type.startsWith('image/'));
      if (images.length === 0) return;
      const metas = images.map(fileToFileMeta);
      addManualFiles(role, metas);
    },
    [role, addManualFiles]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/jpeg': [], 'image/png': [] },
  });

  const isRequired = role !== 'annotated';

  return (
    <div className="flex flex-col">
      <div className="text-sm font-medium text-gray-700 mb-2">
        {ROLE_LABELS[role]}
        {isRequired && <span className="text-red-500 ml-0.5">*</span>}
        <span className="text-xs text-gray-400 ml-2">{files.length} 张</span>
      </div>

      {/* Dropzone area */}
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-4 min-h-[180px] flex flex-col items-center justify-center
          cursor-pointer transition-colors
          ${isDragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
        `}
      >
        <input {...getInputProps()} />
        {files.length === 0 ? (
          <div className="text-center text-gray-400 text-sm">
            <p className="text-lg mb-1">+</p>
            <p>拖入或点击选择</p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2 w-full">
            {files.map(f => (
              <div key={f.id} className="relative group">
                <img
                  src={f.blobUrl}
                  alt={f.name}
                  className="w-16 h-16 object-cover rounded border border-gray-200"
                />
                <button
                  onClick={e => {
                    e.stopPropagation();
                    removeManualFile(role, f.id);
                  }}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs
                    flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  ×
                </button>
              </div>
            ))}
            {/* Add more hint */}
            <div className="w-16 h-16 border-2 border-dashed border-gray-300 rounded flex items-center justify-center text-gray-400 text-xl">
              +
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
