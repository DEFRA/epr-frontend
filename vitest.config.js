import { fileURLToPath } from 'node:url'
import { configDefaults, defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    clearMocks: true,
    hookTimeout: 60000,
    fileParallelism: !process.env.CI,
    coverage: {
      provider: 'v8',
      reportsDirectory: './coverage',
      reporter: ['text', 'lcov'],
      include: ['src/**'],
      exclude: [
        ...configDefaults.exclude,
        '.server',
        '.public',
        'coverage',
        'src/server/common/test-helpers',
        'src/client/javascripts/application.js',
        'src/index.js',
        '**/index.js'
      ],
      thresholds: {
        lines: 100,
        statements: 100,
        branches: 100,
        functions: 100
      }
    }
  },
  resolve: {
    alias: {
      '~': fileURLToPath(new URL('.', import.meta.url))
    }
  }
})
