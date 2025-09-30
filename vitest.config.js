import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  test: {
    globals: true,
    clearMocks: true,
    include: ['**/src/**/*.vitest.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.js'],
      exclude: [
        'node_modules/',
        '.server',
        '.public',
        'src/server/common/test-helpers',
        'src/client/javascripts/application.js',
        'src/index.js',
        '**/index.js',
        '**/*.test.js'
      ]
    }
  },
  resolve: {
    alias: {
      '~': fileURLToPath(new URL('.', import.meta.url))
    }
  }
})
