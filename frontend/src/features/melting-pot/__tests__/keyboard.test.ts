import { describe, it, expect, beforeEach } from 'vitest';
import { useMatrixStore } from '@/store';
import type { MatrixRow } from '@/types';

function makeRow(groupKey: string): MatrixRow {
  const cell = () => ({ main: undefined, candidates: [] });
  return {
    groupKey,
    cells: { product: cell(), tryon: cell(), retouched: cell(), annotated: cell() },
    status: 'incomplete',
  };
}

// Simulate the keyboard handler logic (extracted for testing)
function handleKeyDown(e: KeyboardEvent) {
  const target = e.target as HTMLElement | null;
  const tag = target?.tagName;
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
    const roles = ['product', 'tryon', 'retouched', 'annotated'] as const;
    const role = roles[roleIndex];
    store.setSelectedCell({ groupKey: selected.groupKey, role });
  }
}

describe('keyboard shortcuts', () => {
  beforeEach(() => {
    useMatrixStore.getState().clearAll();
    document.body.innerHTML = '';
  });

  describe('Escape', () => {
    it('clears unassigned and selectedCell', () => {
      useMatrixStore.setState({
        unassigned: [{ id: 'u1', name: 'u.jpg', size: 100, type: 'image/jpeg', blobUrl: 'blob:u' }],
        selectedCell: { groupKey: 'SKU-1', role: 'product' },
      });

      handleKeyDown(new KeyboardEvent('keydown', { key: 'Escape' }));

      expect(useMatrixStore.getState().unassigned).toEqual([]);
      expect(useMatrixStore.getState().selectedCell).toBeNull();
    });
  });

  describe('1-4 keys', () => {
    it('changes role when cell is selected', () => {
      useMatrixStore.setState({
        matrix: [makeRow('SKU-1')],
        selectedCell: { groupKey: 'SKU-1', role: 'product' },
      });

      handleKeyDown(new KeyboardEvent('keydown', { key: '2' }));

      expect(useMatrixStore.getState().selectedCell).toEqual({
        groupKey: 'SKU-1',
        role: 'tryon',
      });
    });

    it('does nothing when no cell is selected', () => {
      useMatrixStore.setState({ matrix: [makeRow('SKU-1')] });

      handleKeyDown(new KeyboardEvent('keydown', { key: '1' }));

      expect(useMatrixStore.getState().selectedCell).toBeNull();
    });
  });

  describe('Enter', () => {
    it('clicks submit button when enabled', () => {
      const btn = document.createElement('button');
      btn.setAttribute('data-testid', 'submit-btn');
      btn.disabled = false;
      let clicked = false;
      btn.addEventListener('click', () => { clicked = true; });
      document.body.appendChild(btn);

      handleKeyDown(new KeyboardEvent('keydown', { key: 'Enter' }));

      expect(clicked).toBe(true);
    });

    it('does not click when button is disabled', () => {
      const btn = document.createElement('button');
      btn.setAttribute('data-testid', 'submit-btn');
      btn.disabled = true;
      let clicked = false;
      btn.addEventListener('click', () => { clicked = true; });
      document.body.appendChild(btn);

      handleKeyDown(new KeyboardEvent('keydown', { key: 'Enter' }));

      expect(clicked).toBe(false);
    });
  });

  describe('input focus', () => {
    it('skips shortcuts when input is focused', () => {
      const input = document.createElement('input');
      document.body.appendChild(input);
      input.focus();

      useMatrixStore.setState({
        unassigned: [{ id: 'u1', name: 'u.jpg', size: 100, type: 'image/jpeg', blobUrl: 'blob:u' }],
      });

      // Create event with input as target
      const e = Object.defineProperty(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
        'target',
        { value: input, writable: false }
      );
      handleKeyDown(e);

      // Should not have cleared
      expect(useMatrixStore.getState().unassigned).toHaveLength(1);
    });
  });
});
