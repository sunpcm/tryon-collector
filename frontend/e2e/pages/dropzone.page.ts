import type { Page, Locator } from '@playwright/test';

export class DropzonePage {
  readonly page: Page;
  readonly header: Locator;
  readonly dropHint: Locator;
  readonly nicknameModal: Locator;
  readonly nicknameInput: Locator;
  readonly nicknameSubmit: Locator;

  constructor(page: Page) {
    this.page = page;
    this.header = page.getByText('Tryon Collector');
    this.dropHint = page.getByText(/将图片拖入窗口/);
    this.nicknameModal = page.getByText('欢迎使用 Tryon Collector');
    this.nicknameInput = page.locator('input[placeholder*="花名"]');
    this.nicknameSubmit = page.getByRole('button', { name: '确认' });
  }

  async goto() {
    await this.page.goto('/');
  }

  async enterNickname(name: string) {
    await this.nicknameInput.fill(name);
    await this.nicknameSubmit.click();
  }

  async uploadFiles(filePaths: string[]) {
    // Use the hidden file input from react-dropzone
    const fileInput = this.page.locator('input[type="file"]');
    await fileInput.setInputFiles(filePaths, { timeout: 10000 });
  }
}
