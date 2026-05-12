import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MatrixCellView } from '../MatrixCell';
import { useMatrixStore } from '@/store';
import type { MatrixCell } from '@/types';

function cell(main?: string): MatrixCell {
  return main
    ? {
        main: {
          id: main,
          name: `${main}.jpg`,
          size: 100,
          type: 'image/jpeg',
          blobUrl: `blob:${main}`,
        },
        candidates: [],
      }
    : { main: undefined, candidates: [] };
}

describe('MatrixCellView', () => {
  beforeEach(() => {
    useMatrixStore.getState().clearAll();
  });

  it('calls setSelectedCell on click', () => {
    render(
      <MatrixCellView role="product" cell={cell('img1')} groupKey="SKU-1" />
    );
    fireEvent.click(screen.getByTestId('cell-SKU-1-product'));
    expect(useMatrixStore.getState().selectedCell).toEqual({
      groupKey: 'SKU-1',
      role: 'product',
    });
  });

  it('toggles selection off on second click', () => {
    useMatrixStore
      .getState()
      .setSelectedCell({ groupKey: 'SKU-1', role: 'product' });
    render(
      <MatrixCellView role="product" cell={cell('img1')} groupKey="SKU-1" />
    );
    fireEvent.click(screen.getByTestId('cell-SKU-1-product'));
    expect(useMatrixStore.getState().selectedCell).toBeNull();
  });

  it('applies ring style when selected', () => {
    useMatrixStore
      .getState()
      .setSelectedCell({ groupKey: 'SKU-1', role: 'product' });
    render(
      <MatrixCellView role="product" cell={cell('img1')} groupKey="SKU-1" />
    );
    const el = screen.getByTestId('cell-SKU-1-product');
    expect(el.className).toContain('ring-2');
  });

  it('applies blue border on empty cell when selected', () => {
    useMatrixStore
      .getState()
      .setSelectedCell({ groupKey: 'SKU-1', role: 'product' });
    render(<MatrixCellView role="product" cell={cell()} groupKey="SKU-1" />);
    const el = screen.getByTestId('cell-SKU-1-product');
    expect(el.className).toContain('border-blue-500');
  });
});
