import { create } from 'zustand';
import type {
  FileMeta,
  MatrixRow,
  ClusterResult,
  Role,
  RowSubmitStatus,
} from '@/types';

interface MatrixState {
  files: FileMeta[];
  matrix: MatrixRow[];
  unassigned: FileMeta[];
  rowSubmitStatuses: Record<string, RowSubmitStatus>;
  selectedCell: { groupKey: string; role: Role } | null;
  manualFiles: Record<Role, FileMeta[]>;

  setClusterResult: (result: ClusterResult) => void;
  addFiles: (files: FileMeta[]) => void;
  removeFile: (fileId: string) => void;
  clearAll: () => void;
  clearUnassigned: () => void;
  setSelectedCell: (cell: { groupKey: string; role: Role } | null) => void;
  setCellFile: (groupKey: string, role: Role, file: FileMeta) => void;
  setRowSubmitStatus: (groupKey: string, status: RowSubmitStatus) => void;
  getReadyRows: () => MatrixRow[];
  isAllReady: () => boolean;
  addManualFiles: (role: Role, files: FileMeta[]) => void;
  removeManualFile: (role: Role, fileId: string) => void;
  clearManual: () => void;
  isManualReady: () => boolean;
}

export const useMatrixStore = create<MatrixState>((set, get) => ({
  files: [],
  matrix: [],
  unassigned: [],
  rowSubmitStatuses: {},
  selectedCell: null,
  manualFiles: { product: [], tryon: [], retouched: [], annotated: [] },

  setClusterResult: result =>
    set({
      matrix: result.matrix,
      unassigned: result.unassigned,
    }),

  addFiles: newFiles =>
    set(state => ({
      files: [...state.files, ...newFiles],
    })),

  removeFile: fileId => {
    const file = get().files.find(f => f.id === fileId);
    if (file) URL.revokeObjectURL(file.blobUrl);
    set(state => ({
      files: state.files.filter(f => f.id !== fileId),
    }));
  },

  clearAll: () => {
    const { files, manualFiles } = get();
    for (const f of files) URL.revokeObjectURL(f.blobUrl);
    for (const role of Object.keys(manualFiles) as Role[]) {
      for (const f of manualFiles[role]) URL.revokeObjectURL(f.blobUrl);
    }
    set({
      files: [],
      matrix: [],
      unassigned: [],
      rowSubmitStatuses: {},
      selectedCell: null,
      manualFiles: { product: [], tryon: [], retouched: [], annotated: [] },
    });
  },

  clearUnassigned: () => {
    const { unassigned } = get();
    for (const f of unassigned) URL.revokeObjectURL(f.blobUrl);
    set({ unassigned: [] });
  },

  setSelectedCell: cell => set({ selectedCell: cell }),

  setCellFile: (groupKey, role, file) =>
    set(state => {
      // Revoke old blob URL if replacing
      const row = state.matrix.find(r => r.groupKey === groupKey);
      const old = row?.cells[role]?.main;
      if (old) URL.revokeObjectURL(old.blobUrl);
      return {
        matrix: state.matrix.map(r => {
          if (r.groupKey !== groupKey) return r;
          return {
            ...r,
            cells: {
              ...r.cells,
              [role]: { ...r.cells[role], main: file },
            },
          };
        }),
      };
    }),

  setRowSubmitStatus: (groupKey, status) =>
    set(state => ({
      rowSubmitStatuses: { ...state.rowSubmitStatuses, [groupKey]: status },
    })),

  getReadyRows: () => get().matrix.filter(r => r.status === 'ready'),

  isAllReady: () => {
    const { matrix, unassigned } = get();
    return (
      matrix.length > 0 &&
      matrix.every(r => r.status === 'ready') &&
      unassigned.length === 0
    );
  },

  addManualFiles: (role, newFiles) =>
    set(state => ({
      manualFiles: {
        ...state.manualFiles,
        [role]: [...state.manualFiles[role], ...newFiles],
      },
    })),

  removeManualFile: (role, fileId) => {
    const file = get().manualFiles[role].find(f => f.id === fileId);
    if (file) URL.revokeObjectURL(file.blobUrl);
    set(state => ({
      manualFiles: {
        ...state.manualFiles,
        [role]: state.manualFiles[role].filter(f => f.id !== fileId),
      },
    }));
  },

  clearManual: () => {
    const { manualFiles } = get();
    for (const role of Object.keys(manualFiles) as Role[]) {
      for (const f of manualFiles[role]) URL.revokeObjectURL(f.blobUrl);
    }
    set({
      manualFiles: { product: [], tryon: [], retouched: [], annotated: [] },
    });
  },

  isManualReady: () => {
    const { manualFiles } = get();
    return (
      manualFiles.product.length > 0 &&
      manualFiles.tryon.length > 0 &&
      manualFiles.retouched.length > 0
    );
  },
}));
