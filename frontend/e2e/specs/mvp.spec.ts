import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import { DropzonePage } from '../pages/dropzone.page';
import { MatrixPage } from '../pages/matrix.page';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES = path.resolve(__dirname, '../fixtures');

// Pre-set nickname in storageState to skip modal in most tests
test.use({
  storageState: {
    cookies: [],
    origins: [
      {
        origin: 'https://localhost:5180',
        localStorage: [{ name: 'tryon-nickname', value: '"测试设计师"' }],
      },
    ],
  },
});

test.describe('MVP E2E', () => {
  test('1. nickname flow: first visit shows modal, enter nickname persists', async ({
    page,
  }) => {
    // Clear storage to simulate first visit
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    const dropzone = new DropzonePage(page);
    await expect(dropzone.nicknameModal).toBeVisible();

    await dropzone.enterNickname('测试设计师');

    // Modal should close
    await expect(dropzone.nicknameModal).not.toBeVisible();

    // Header should show nickname
    await expect(page.getByText('测试设计师')).toBeVisible();

    // Refresh — nickname persists
    await page.reload();
    await expect(dropzone.nicknameModal).not.toBeVisible();
    await expect(page.getByText('测试设计师')).toBeVisible();
  });

  test('2. golden path: 18 files cluster into 7 ready rows', async ({
    page,
  }) => {
    const dropzone = new DropzonePage(page);
    const matrix = new MatrixPage(page);

    await page.goto('/');

    // Upload 18 files: 4 product + 7 tryon + 7 retouched (but we have 7 product too)
    const files = [
      'SKU001-product.jpg',
      'SKU002-product.jpg',
      'SKU003-product.jpg',
      'SKU004-product.jpg',
      'SKU005-product.jpg',
      'SKU006-product.jpg',
      'SKU007-product.jpg',
      'SKU001-tryon.jpg',
      'SKU002-tryon.jpg',
      'SKU003-tryon.jpg',
      'SKU004-tryon.jpg',
      'SKU005-tryon.jpg',
      'SKU006-tryon.jpg',
      'SKU007-tryon.jpg',
      'SKU001-retouched.jpg',
      'SKU002-retouched.jpg',
      'SKU003-retouched.jpg',
      'SKU004-retouched.jpg',
      'SKU005-retouched.jpg',
      'SKU006-retouched.jpg',
      'SKU007-retouched.jpg',
    ].map(f => path.join(FIXTURES, f));

    await dropzone.uploadFiles(files);

    // Should see matrix with 7 rows
    await expect(page.getByText('SKU001')).toBeVisible();
    await expect(page.getByText('SKU007')).toBeVisible();

    // All rows should be ready
    const readyBadges = page.getByText('就绪', { exact: true });
    await expect(readyBadges).toHaveCount(7);

    // Submit button should be visible
    await expect(matrix.submitButton).toBeVisible();
  });

  test('3. partial incomplete: missing retouched marks row incomplete', async ({
    page,
  }) => {
    const dropzone = new DropzonePage(page);
    await page.goto('/');

    // Upload only product + tryon (missing retouched)
    const files = ['SKU001-product.jpg', 'SKU001-tryon.jpg'].map(f =>
      path.join(FIXTURES, f)
    );

    await dropzone.uploadFiles(files);

    // Should show incomplete status
    await expect(page.getByText('SKU001')).toBeVisible();
    await expect(
      page.getByText('不完整', { exact: true }).first()
    ).toBeVisible();

    // Submit button should be disabled
    const submitBtn = page.getByRole('button', { name: '一键批量提交' });
    await expect(submitBtn).toBeDisabled();
  });

  test('4. unassigned file: unknown file goes to unassigned section', async ({
    page,
  }) => {
    const dropzone = new DropzonePage(page);
    await page.goto('/');

    // Upload a recognized set + one unrecognizable file
    const files = [
      'SKU001-product.jpg',
      'SKU001-tryon.jpg',
      'SKU001-retouched.jpg',
      'random-photo.jpg',
    ].map(f => path.join(FIXTURES, f));

    await dropzone.uploadFiles(files);

    // Should see the recognized row
    await expect(page.getByText('SKU001')).toBeVisible();

    // Should see unassigned section
    await expect(page.getByText('未归类').first()).toBeVisible();

    // Submit button should be disabled (unassigned files present)
    const submitBtn = page.getByRole('button', { name: '一键批量提交' });
    await expect(submitBtn).toBeDisabled();
  });

  test('6. failed row retention: rejected rows stay on screen with status badge', async ({
    page,
  }) => {
    const dropzone = new DropzonePage(page);

    await page.goto('/');

    // Select business line and category (required for submit)
    await page.getByText('春季女装').click();
    await page.getByText('连衣裙').click();

    // Upload 2 complete SKU sets
    const files = [
      'SKU001-product.jpg',
      'SKU001-tryon.jpg',
      'SKU001-retouched.jpg',
      'SKU002-product.jpg',
      'SKU002-tryon.jpg',
      'SKU002-retouched.jpg',
    ].map(f => path.join(FIXTURES, f));

    await dropzone.uploadFiles(files);

    // Wait for matrix to show 2 ready rows
    await expect(page.getByText('SKU001')).toBeVisible();
    await expect(page.getByText('SKU002')).toBeVisible();
    const readyBadges = page.getByText('就绪', { exact: true });
    await expect(readyBadges).toHaveCount(2);

    // Intercept API call — accept SKU001, reject SKU002
    await page.route('**/api/bundles/batch', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          submit_id: 'mock-submit-id',
          accepted: [{ group_key: 'SKU001', task_id: 'mock-task-001' }],
          rejected: [
            {
              group_key: 'SKU002',
              reason: 'disk_full',
              detail: 'mock disk full',
            },
          ],
        }),
      });
    });

    // Click submit
    const submitBtn = page.getByRole('button', { name: '一键批量提交' });
    await submitBtn.click();

    // Wait for status badges
    await expect(page.getByText('已接受').first()).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText('已拒绝').first()).toBeVisible();

    // Matrix should still be visible (not cleared)
    await expect(page.getByText('SKU001')).toBeVisible();
    await expect(page.getByText('SKU002')).toBeVisible();
  });

  test('7. clustering P95 < 50ms performance baseline', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#root')).toBeVisible();

    // Measure clustering performance via exposed test hook
    const p95 = await page.evaluate(() => {
      const cluster = (window as Record<string, unknown>).__testCluster as
        | ((
            files: {
              id: string;
              name: string;
              size: number;
              blobUrl: string;
              type: string;
            }[]
          ) => unknown)
        | undefined;
      if (!cluster) throw new Error('__testCluster not available');

      // Build synthetic FileMeta list matching 7 SKUs × 3 roles
      const names = [
        'SKU001-product.jpg',
        'SKU002-product.jpg',
        'SKU003-product.jpg',
        'SKU004-product.jpg',
        'SKU005-product.jpg',
        'SKU006-product.jpg',
        'SKU007-product.jpg',
        'SKU001-tryon.jpg',
        'SKU002-tryon.jpg',
        'SKU003-tryon.jpg',
        'SKU004-tryon.jpg',
        'SKU005-tryon.jpg',
        'SKU006-tryon.jpg',
        'SKU007-tryon.jpg',
        'SKU001-retouched.jpg',
        'SKU002-retouched.jpg',
        'SKU003-retouched.jpg',
        'SKU004-retouched.jpg',
        'SKU005-retouched.jpg',
        'SKU006-retouched.jpg',
        'SKU007-retouched.jpg',
      ];
      const files = names.map((name, i) => ({
        id: `perf-${i}`,
        name,
        size: 1024,
        blobUrl: '',
        type: 'image/jpeg',
      }));

      // Run 100 iterations and collect timings
      const timings: number[] = [];
      for (let i = 0; i < 100; i++) {
        const start = performance.now();
        cluster(files);
        timings.push(performance.now() - start);
      }

      timings.sort((a, b) => a - b);
      return timings[Math.floor(timings.length * 0.95)]; // P95
    });

    // P95 must be under 50ms
    expect(p95).toBeLessThan(50);
  });
});
