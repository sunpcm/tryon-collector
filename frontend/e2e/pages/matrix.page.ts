import type { Page, Locator } from '@playwright/test';

export class MatrixPage {
  readonly page: Page;
  readonly matrixContainer: Locator;
  readonly readyCount: Locator;
  readonly incompleteCount: Locator;
  readonly unassignedSection: Locator;
  readonly submitButton: Locator;
  readonly clearButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.matrixContainer = page
      .locator('[class*="border"][class*="rounded-lg"]')
      .first();
    this.readyCount = page.getByText(/就绪/).first();
    this.incompleteCount = page.getByText(/不完整/).first();
    this.unassignedSection = page.getByText('未归类文件');
    this.submitButton = page.getByRole('button', { name: '一键批量提交' });
    this.clearButton = page.getByText('清空全部');
  }

  getRow(groupKey: string): Locator {
    return this.page.getByText(groupKey, { exact: true }).locator('..');
  }

  getRowCount(): Promise<number> {
    // Count rows by looking for the groupKey font-mono elements
    return this.page.locator('.font-mono').count();
  }

  async expectReadyCount(count: number) {
    await this.page.getByText(`就绪`, { exact: false }).first().waitFor();
    const text = await this.page.getByText(/就绪/).first().textContent();
    if (!text?.includes(String(count))) {
      throw new Error(`Expected ready count ${count}, got: ${text}`);
    }
  }
}
