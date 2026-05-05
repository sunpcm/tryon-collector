import { defineConfig, devices } from '@playwright/test';

/**
 * See https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  // 测试文件存放目录
  testDir: './e2e',

  // 并行运行测试
  fullyParallel: true,

  // 在 CI 环境下禁止 `test.only`
  forbidOnly: !!process.env.CI,

  // CI 环境下重试 2 次，本地不重试
  retries: process.env.CI ? 2 : 0,

  // CI 环境下使用 1 个 worker (避免资源竞争)，本地使用默认值
  workers: process.env.CI ? 1 : undefined,

  // 报告格式：本地用 html，CI 用 dot
  reporter: 'html',

  // 共享配置
  use: {
    // 基础 URL，这样在测试里可以直接写 page.goto('/')
    baseURL: 'http://localhost:5173',

    // 收集追踪信息：第一次重试时收集 (调试神器)
    trace: 'on-first-retry',
  },

  // ✅ 核心配置：自动启动 Vite 开发服务器
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI, // 本地开发如果已经开了服务，就直接用
    timeout: 120 * 1000, // 给 2 分钟启动时间
  },

  // 配置多浏览器测试
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    /* 移动端视口测试 (可选) */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },
  ],
});
