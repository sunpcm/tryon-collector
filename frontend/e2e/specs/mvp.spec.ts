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
        origin: 'http://localhost:5173',
        localStorage: [
          { name: 'tryon-nickname', value: '"测试设计师"' },
        ],
      },
    ],
  },
});

test.describe('MVP E2E', () => {
  test('1. nickname flow: first visit shows modal, enter nickname persists', async ({ page }) => {
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

  test('2. golden path: 18 files cluster into 7 ready rows', async ({ page }) => {
    const dropzone = new DropzonePage(page);
    const matrix = new MatrixPage(page);

    await page.goto('/');

    // Upload 18 files: 4 product + 7 tryon + 7 retouched (but we have 7 product too)
    const files = [
      'SKU001-product.jpg', 'SKU002-product.jpg', 'SKU003-product.jpg', 'SKU004-product.jpg',
      'SKU005-product.jpg', 'SKU006-product.jpg', 'SKU007-product.jpg',
      'SKU001-tryon.jpg', 'SKU002-tryon.jpg', 'SKU003-tryon.jpg', 'SKU004-tryon.jpg',
      'SKU005-tryon.jpg', 'SKU006-tryon.jpg', 'SKU007-tryon.jpg',
      'SKU001-retouched.jpg', 'SKU002-retouched.jpg', 'SKU003-retouched.jpg', 'SKU004-retouched.jpg',
      'SKU005-retouched.jpg', 'SKU006-retouched.jpg', 'SKU007-retouched.jpg',
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

  test('3. partial incomplete: missing retouched marks row incomplete', async ({ page }) => {
    const dropzone = new DropzonePage(page);
    await page.goto('/');

    // Upload only product + tryon (missing retouched)
    const files = [
      'SKU001-product.jpg',
      'SKU001-tryon.jpg',
    ].map(f => path.join(FIXTURES, f));

    await dropzone.uploadFiles(files);

    // Should show incomplete status
    await expect(page.getByText('SKU001')).toBeVisible();
    await expect(page.getByText('不完整', { exact: true }).first()).toBeVisible();

    // Submit button should be disabled
    const submitBtn = page.getByRole('button', { name: '一键批量提交' });
    await expect(submitBtn).toBeDisabled();
  });

  test('4. unassigned file: unknown file goes to unassigned section', async ({ page }) => {
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
});
