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

  setClusterResult: (result: ClusterResult) => void;
  addFiles: (files: FileMeta[]) => void;
  removeFile: (fileId: string) => void;
  clearAll: () => void;
  setSelectedCell: (cell: { groupKey: string; role: Role } | null) => void;
  setRowSubmitStatus: (groupKey: string, status: RowSubmitStatus) => void;
  getReadyRows: () => MatrixRow[];
  isAllReady: () => boolean;
}

export const useMatrixStore = create<MatrixState>((set, get) => ({
  files: [],
  matrix: [],
  unassigned: [],
  rowSubmitStatuses: {},
  selectedCell: null,

  setClusterResult: result =>
    set({
      matrix: result.matrix,
      unassigned: result.unassigned,
    }),

  addFiles: newFiles =>
    set(state => ({
      files: [...state.files, ...newFiles],
    })),

  removeFile: fileId =>
    set(state => ({
      files: state.files.filter(f => f.id !== fileId),
    })),

  clearAll: () =>
    set({
      files: [],
      matrix: [],
      unassigned: [],
      rowSubmitStatuses: {},
      selectedCell: null,
    }),

  setSelectedCell: cell => set({ selectedCell: cell }),

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
}));
