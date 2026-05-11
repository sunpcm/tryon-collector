import { defineConfig } from 'vitest/config';
import { resolve } from 'path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import svgr from 'vite-plugin-svgr';
import basicSsl from '@vitejs/plugin-basic-ssl';
import { configDefaults } from 'vitest/config';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), svgr(), basicSsl()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5180,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8003',
        changeOrigin: true,
      },
      '/health': {
        target: 'http://127.0.0.1:8003',
        changeOrigin: true,
      },
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
