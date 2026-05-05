import { test, expect } from '@playwright/test';

test.describe('App Home Page', () => {
  test.beforeEach(async ({ page }) => {
    // Playwright 会启动浏览器去访问这个地址
    // 确保 playwright.config.ts 里配置了 baseURL，或者写完整地址 'http://localhost:5173'
    await page.goto('/');
  });

  test('should load critical UI elements @smoke', async ({ page }) => {
    // 验证页面标题
    await expect(page).toHaveTitle('My React Application');

    // 验证文本可见
    await expect(page.getByText('React TypeScript Template')).toBeVisible();
  });
});
