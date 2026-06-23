import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'happy-dom',
    include: ['tests/**/*.test.ts'],
    exclude: ['node_modules', '.output', '.nuxt', 'tests/e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: ['server/utils/**', 'server/middleware/**'],
      exclude: ['**/*.test.ts', '**/node_modules/**'],
    },
    // 在测试运行前注入 Nuxt/Nitro auto-import 全局函数
    setupFiles: ['./tests/setup/nuxt-globals.ts'],
  },
  resolve: {
    alias: {
      '~': resolve(__dirname),
      '~~': resolve(__dirname),
      '@@': resolve(__dirname),
    },
  },
})
