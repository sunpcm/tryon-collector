import { expect, test } from '@playwright/test';

test.describe('Tryon Collector · smoke', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('boots with expected title and root node @smoke', async ({ page }) => {
    await expect(page).toHaveTitle('Tryon Collector');
    await expect(page.locator('#root')).toBeVisible();
  });
});
