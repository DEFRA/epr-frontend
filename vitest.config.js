import { fileURLToPath } from 'node:url'
import { configDefaults, defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    clearMocks: true,
    coverage: {
      reporter: ['text', 'lcov'],
      include: ['src/**/*.js'],
      exclude: [
        ...configDefaults.exclude,
        '.server',
        '.public',
        'src/server/common/test-helpers',
        'src/client/javascripts/application.js',
        'src/index.js',
        '**/index.js'
      ]
    }
  },
  resolve: {
    alias: {
      '~': fileURLToPath(new URL('.', import.meta.url))
    }
  }
})
