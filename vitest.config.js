import { fileURLToPath } from 'node:url'
import { configDefaults, defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    clearMocks: true,
    testTimeout: 10000,
    hookTimeout: 60000,
    fileParallelism: !process.env.CI,
    reporters: process.env.CI
      ? ['default', ['json', { outputFile: 'coverage/test-results.json' }]]
      : ['default'],
    setupFiles: ['.vite/setup-auditing.js', '.vite/setup-files.js'],
    coverage: {
      provider: 'v8',
      reportsDirectory: './coverage',
      reporter: ['text', 'lcov', 'json-summary'],
      include: ['src/**', 'scripts/**'],
      exclude: [
        ...configDefaults.exclude,
        '.public',
        '.server',
        '**/.gitkeep',
        '**/*.md',
        'coverage',
        'src/**/*.json',
        'src/**/*.njk',
        'src/**/*.scss',
        'src/client/javascripts/application.js',
        'src/server/auth/types',
        'src/server/common/test-helpers',
        'src/server/types'
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
