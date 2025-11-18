import { fileURLToPath } from 'node:url'
import { configDefaults, defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    clearMocks: true,
    hookTimeout: 60000,
    fileParallelism: !process.env.CI,
    coverage: {
      provider: 'v8',
      reportsDirectory: './coverage',
      reporter: ['text', 'lcov'],
      include: ['src/**', 'scripts/**/*.js'],
      exclude: [
        ...configDefaults.exclude,
        '.public',
        '.server',
        '**/*.md',
        '**/index.js',
        'coverage',
        'src/**/*.njk',
        'src/client/javascripts/application.js',
        'src/index.js',
        'src/server/common/test-helpers',
        'scripts/**/*.test.js',
        'scripts/check-locales.js'
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
