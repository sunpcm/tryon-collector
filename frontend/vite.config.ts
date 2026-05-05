import { defineConfig } from 'vitest/config';
import { resolve } from 'path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import svgr from 'vite-plugin-svgr';
import { configDefaults } from 'vitest/config';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), svgr()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  // Vitest 测试 config
  test: {
    globals: true, // 开启全局 API (describe, it, expect)，类似 Jest
    environment: 'jsdom', // 模拟浏览器环境
    setupFiles: './setupTests.ts', // 初始化文件
    css: true, // 处理 CSS 导入
    exclude: [...configDefaults.exclude, 'e2e/**'],
  },
});
