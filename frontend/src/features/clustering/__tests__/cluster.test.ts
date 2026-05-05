import { describe, it, expect } from 'vitest';
import { cluster } from '../cluster';
import type { FileMeta } from '@/types';

function makeFile(name: string, id?: string): FileMeta {
  return {
    id: id ?? name,
    name,
    size: 1024,
    type: 'image/jpeg',
    blobUrl: `blob:${name}`,
  };
}

describe('cluster', () => {
  // --- Golden path: standard naming ---
  it('groups files by groupKey and assigns roles', () => {
    const files = [
      makeFile('SKU12345-product.jpg'),
      makeFile('SKU12345-tryon.jpg'),
      makeFile('SKU12345-retouched.jpg'),
    ];
    const result = cluster(files);
    expect(result.matrix).toHaveLength(1);
    expect(result.matrix[0].groupKey).toBe('SKU12345');
    expect(result.matrix[0].status).toBe('ready');
    expect(result.matrix[0].cells.product.main?.name).toBe(
      'SKU12345-product.jpg'
    );
    expect(result.matrix[0].cells.tryon.main?.name).toBe('SKU12345-tryon.jpg');
    expect(result.matrix[0].cells.retouched.main?.name).toBe(
      'SKU12345-retouched.jpg'
    );
    expect(result.unassigned).toHaveLength(0);
  });

  // --- Multiple groups ---
  it('handles multiple distinct groupKeys', () => {
    const files = [
      makeFile('SKU001-product.jpg'),
      makeFile('SKU001-tryon.jpg'),
      makeFile('SKU001-retouched.jpg'),
      makeFile('SKU002-product.jpg'),
      makeFile('SKU002-tryon.jpg'),
      makeFile('SKU002-retouched.jpg'),
    ];
    const result = cluster(files);
    expect(result.matrix).toHaveLength(2);
    expect(result.matrix.map(r => r.groupKey)).toEqual(['SKU001', 'SKU002']);
  });

  // --- Incomplete row (missing required role) ---
  it('marks row as incomplete when a required role is missing', () => {
    const files = [
      makeFile('SKU12345-product.jpg'),
      makeFile('SKU12345-tryon.jpg'),
      // missing retouched
    ];
    const result = cluster(files);
    expect(result.matrix[0].status).toBe('incomplete');
  });

  // --- Overflow row (multiple candidates for one role) ---
  it('marks row as overflow when a role has multiple candidates', () => {
    const files = [
      makeFile('SKU12345-product.jpg'),
      makeFile('SKU12345-tryon.jpg'),
      makeFile('SKU12345-retouched.jpg'),
      makeFile('SKU12345-retouched-2.jpg'),
    ];
    const result = cluster(files);
    expect(result.matrix[0].status).toBe('overflow');
    expect(result.matrix[0].cells.retouched.candidates).toHaveLength(2);
  });

  // --- Unassigned: no groupKey ---
  it('puts files without recognizable groupKey into unassigned', () => {
    const files = [
      makeFile('random-photo.jpg'),
      makeFile('SKU12345-product.jpg'),
    ];
    const result = cluster(files);
    expect(result.unassigned).toHaveLength(1);
    expect(result.unassigned[0].name).toBe('random-photo.jpg');
    expect(result.matrix).toHaveLength(1);
  });

  // --- Unassigned: no role keyword ---
  it('puts files with groupKey but no role keyword into unassigned', () => {
    const files = [makeFile('SKU12345-photo.jpg')];
    const result = cluster(files);
    expect(result.unassigned).toHaveLength(1);
  });

  // --- Chinese keywords ---
  it('detects roles from Chinese keywords', () => {
    const files = [
      makeFile('SKU12345-原图.jpg'),
      makeFile('SKU12345-试穿.jpg'),
      makeFile('SKU12345-精修.jpg'),
    ];
    const result = cluster(files);
    expect(result.matrix[0].status).toBe('ready');
    expect(result.matrix[0].cells.product.main?.name).toContain('原图');
    expect(result.matrix[0].cells.tryon.main?.name).toContain('试穿');
    expect(result.matrix[0].cells.retouched.main?.name).toContain('精修');
  });

  // --- Case insensitive ---
  it('matches role keywords case-insensitively', () => {
    const files = [
      makeFile('SKU12345-PRODUCT.jpg'),
      makeFile('SKU12345-TRYON.jpg'),
      makeFile('SKU12345-RETOUCHED.jpg'),
    ];
    const result = cluster(files);
    expect(result.matrix[0].status).toBe('ready');
  });

  // --- Annotated role (optional) ---
  it('handles annotated role as optional', () => {
    const files = [
      makeFile('SKU12345-product.jpg'),
      makeFile('SKU12345-tryon.jpg'),
      makeFile('SKU12345-retouched.jpg'),
      makeFile('SKU12345-annotated.jpg'),
    ];
    const result = cluster(files);
    expect(result.matrix[0].status).toBe('ready');
    expect(result.matrix[0].cells.annotated.main?.name).toBe(
      'SKU12345-annotated.jpg'
    );
  });

  // --- Empty input ---
  it('returns empty result for no files', () => {
    const result = cluster([]);
    expect(result.matrix).toHaveLength(0);
    expect(result.unassigned).toHaveLength(0);
  });

  // --- All unassigned ---
  it('puts all files into unassigned when none match', () => {
    const files = [makeFile('a.jpg'), makeFile('b.png')];
    const result = cluster(files);
    expect(result.matrix).toHaveLength(0);
    expect(result.unassigned).toHaveLength(2);
  });

  // --- Mixed assigned and unassigned ---
  it('correctly separates assigned and unassigned files', () => {
    const files = [
      makeFile('SKU001-product.jpg'),
      makeFile('SKU001-tryon.jpg'),
      makeFile('SKU001-retouched.jpg'),
      makeFile('random.jpg'),
      makeFile('another-random.png'),
    ];
    const result = cluster(files);
    expect(result.matrix).toHaveLength(1);
    expect(result.unassigned).toHaveLength(2);
  });

  // --- Candidate sorting by trailing number ---
  it('sorts candidates by trailing number and picks first as main', () => {
    const files = [
      makeFile('SKU12345-product-3.jpg'),
      makeFile('SKU12345-product-1.jpg'),
      makeFile('SKU12345-product-2.jpg'),
      makeFile('SKU12345-tryon.jpg'),
      makeFile('SKU12345-retouched.jpg'),
    ];
    const result = cluster(files);
    const productCell = result.matrix[0].cells.product;
    expect(productCell.candidates).toHaveLength(3);
    expect(productCell.main?.name).toBe('SKU12345-product-1.jpg');
  });

  // --- Underscore separator in groupKey ---
  it('handles underscore separator in groupKey', () => {
    const files = [
      makeFile('ABCD_0423-product.jpg'),
      makeFile('ABCD_0423-tryon.jpg'),
      makeFile('ABCD_0423-retouched.jpg'),
    ];
    const result = cluster(files);
    expect(result.matrix).toHaveLength(1);
    expect(result.matrix[0].groupKey).toBe('ABCD_0423');
    expect(result.matrix[0].status).toBe('ready');
  });

  // --- Mixed language keywords ---
  it('handles mixed Chinese and English keywords in same batch', () => {
    const files = [
      makeFile('SKU001-原图.jpg'),
      makeFile('SKU001-tryon.jpg'),
      makeFile('SKU001-精修.jpg'),
      makeFile('SKU002-product.jpg'),
      makeFile('SKU002-试穿.jpg'),
      makeFile('SKU002-retouched.jpg'),
    ];
    const result = cluster(files);
    expect(result.matrix).toHaveLength(2);
    expect(result.matrix.every(r => r.status === 'ready')).toBe(true);
  });

  // --- Custom regex ---
  it('supports custom groupKeyRegex via config', () => {
    const files = [
      makeFile('ORDER-999-front.jpg'),
      makeFile('ORDER-999-back.jpg'),
    ];
    const result = cluster(files, {
      groupKeyRegex: /(?<groupKey>ORDER-\d+)/,
      roleKeywords: {
        product: ['front'],
        tryon: ['back'],
        retouched: ['side'],
        annotated: ['note'],
      },
    });
    expect(result.matrix).toHaveLength(1);
    expect(result.matrix[0].groupKey).toBe('ORDER-999');
    expect(result.matrix[0].cells.product.main?.name).toContain('front');
    expect(result.matrix[0].cells.tryon.main?.name).toContain('back');
  });

  // --- Only product + tryon (incomplete) ---
  it('marks as incomplete when only product and tryon present', () => {
    const files = [
      makeFile('SKU001-product.jpg'),
      makeFile('SKU001-tryon.jpg'),
    ];
    const result = cluster(files);
    expect(result.matrix[0].status).toBe('incomplete');
  });

  // --- Multiple groups with mixed statuses ---
  it('handles multiple groups with different statuses', () => {
    const files = [
      makeFile('SKU001-product.jpg'),
      makeFile('SKU001-tryon.jpg'),
      makeFile('SKU001-retouched.jpg'),
      makeFile('SKU002-product.jpg'),
      makeFile('SKU002-tryon.jpg'),
      // SKU002 missing retouched
    ];
    const result = cluster(files);
    expect(result.matrix).toHaveLength(2);
    const sku1 = result.matrix.find(r => r.groupKey === 'SKU001')!;
    const sku2 = result.matrix.find(r => r.groupKey === 'SKU002')!;
    expect(sku1.status).toBe('ready');
    expect(sku2.status).toBe('incomplete');
  });

  // --- File with no extension ---
  it('handles files without extension', () => {
    const files = [
      makeFile('SKU12345-product'),
      makeFile('SKU12345-tryon'),
      makeFile('SKU12345-retouched'),
    ];
    const result = cluster(files);
    expect(result.matrix).toHaveLength(1);
    expect(result.matrix[0].status).toBe('ready');
  });

  // --- Large batch performance ---
  it('clusters 200 files in under 50ms', () => {
    const files: FileMeta[] = [];
    for (let i = 0; i < 50; i++) {
      const sku = `SKU${String(i).padStart(5, '0')}`;
      files.push(makeFile(`${sku}-product.jpg`));
      files.push(makeFile(`${sku}-tryon.jpg`));
      files.push(makeFile(`${sku}-retouched.jpg`));
      if (i % 5 === 0) files.push(makeFile(`${sku}-annotated.jpg`));
    }
    const start = performance.now();
    const result = cluster(files);
    const elapsed = performance.now() - start;

    expect(result.matrix).toHaveLength(50);
    expect(elapsed).toBeLessThan(50);
  });

  // --- Stable sort by groupKey ---
  it('returns rows sorted alphabetically by groupKey', () => {
    const files = [
      makeFile('SKU003-product.jpg'),
      makeFile('SKU003-tryon.jpg'),
      makeFile('SKU003-retouched.jpg'),
      makeFile('SKU001-product.jpg'),
      makeFile('SKU001-tryon.jpg'),
      makeFile('SKU001-retouched.jpg'),
      makeFile('SKU002-product.jpg'),
      makeFile('SKU002-tryon.jpg'),
      makeFile('SKU002-retouched.jpg'),
    ];
    const result = cluster(files);
    expect(result.matrix.map(r => r.groupKey)).toEqual([
      'SKU001',
      'SKU002',
      'SKU003',
    ]);
  });

  // --- Extra keywords: "ref" for product ---
  it('detects "ref" as product keyword', () => {
    const files = [
      makeFile('SKU12345-ref.jpg'),
      makeFile('SKU12345-tryon.jpg'),
      makeFile('SKU12345-retouched.jpg'),
    ];
    const result = cluster(files);
    expect(result.matrix[0].cells.product.main?.name).toContain('ref');
  });

  // --- Extra keywords: "gen" for tryon ---
  it('detects "gen" as tryon keyword', () => {
    const files = [
      makeFile('SKU12345-product.jpg'),
      makeFile('SKU12345-gen.jpg'),
      makeFile('SKU12345-retouched.jpg'),
    ];
    const result = cluster(files);
    expect(result.matrix[0].cells.tryon.main?.name).toContain('gen');
  });
});
