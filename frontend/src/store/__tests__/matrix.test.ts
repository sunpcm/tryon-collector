import { describe, it, expect, beforeEach } from 'vitest';
import { useMatrixStore } from '../matrix';
import type { FileMeta, MatrixRow } from '@/types';

function makeFile(id: string): FileMeta {
  return { id, name: `${id}.jpg`, size: 100, type: 'image/jpeg', blobUrl: `blob:${id}` };
}

function makeRow(groupKey: string): MatrixRow {
  const cell = () => ({ main: undefined, candidates: [] });
  return {
    groupKey,
    cells: { product: cell(), tryon: cell(), retouched: cell(), annotated: cell() },
    status: 'incomplete',
  };
}

describe('matrix store', () => {
  beforeEach(() => {
    useMatrixStore.getState().clearAll();
  });

  describe('setCellFile', () => {
    it('sets main on the target cell', () => {
      const row = makeRow('SKU-1');
      useMatrixStore.setState({ matrix: [row] });
      const file = makeFile('f1');

      useMatrixStore.getState().setCellFile('SKU-1', 'product', file);

      const updated = useMatrixStore.getState().matrix[0];
      expect(updated.cells.product.main).toBe(file);
    });

    it('does not affect other cells', () => {
      const row = makeRow('SKU-1');
      useMatrixStore.setState({ matrix: [row] });
      const file = makeFile('f1');

      useMatrixStore.getState().setCellFile('SKU-1', 'product', file);

      const updated = useMatrixStore.getState().matrix[0];
      expect(updated.cells.tryon.main).toBeUndefined();
      expect(updated.cells.retouched.main).toBeUndefined();
    });

    it('does not affect other rows', () => {
      useMatrixStore.setState({ matrix: [makeRow('SKU-1'), makeRow('SKU-2')] });
      const file = makeFile('f1');

      useMatrixStore.getState().setCellFile('SKU-1', 'product', file);

      const rows = useMatrixStore.getState().matrix;
      expect(rows[0].cells.product.main).toBe(file);
      expect(rows[1].cells.product.main).toBeUndefined();
    });

    it('replaces existing main', () => {
      const row = makeRow('SKU-1');
      row.cells.tryon.main = makeFile('old');
      useMatrixStore.setState({ matrix: [row] });
      const fresh = makeFile('new');

      useMatrixStore.getState().setCellFile('SKU-1', 'tryon', fresh);

      expect(useMatrixStore.getState().matrix[0].cells.tryon.main?.id).toBe('new');
    });
  });

  describe('setSelectedCell', () => {
    it('sets and clears selection', () => {
      expect(useMatrixStore.getState().selectedCell).toBeNull();

      useMatrixStore.getState().setSelectedCell({ groupKey: 'SKU-1', role: 'product' });
      expect(useMatrixStore.getState().selectedCell).toEqual({ groupKey: 'SKU-1', role: 'product' });

      useMatrixStore.getState().setSelectedCell(null);
      expect(useMatrixStore.getState().selectedCell).toBeNull();
    });

    it('clears on clearAll', () => {
      useMatrixStore.getState().setSelectedCell({ groupKey: 'SKU-1', role: 'product' });
      useMatrixStore.getState().clearAll();
      expect(useMatrixStore.getState().selectedCell).toBeNull();
    });
  });
});
