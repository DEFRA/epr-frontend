import { globSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { configDefaults, defineConfig } from 'vitest/config'

const root = fileURLToPath(new URL('.', import.meta.url))

const usesModuleMocks = (file) =>
  /vi\.(mock|doMock)\(/.test(readFileSync(`${root}${file}`, 'utf8'))

// A module mock only reaches importers evaluated after it, so these files
// need a fresh module graph; everything else shares one per worker. Shared
// files run first: a worker that has run a mocking file keeps its mocks.
const moduleMockingTests = globSync('{src,scripts}/**/*.test.js', {
  cwd: root
}).filter(usesModuleMocks)

export default defineConfig({
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'shared',
          isolate: false,
          sequence: { groupOrder: 0 },
          exclude: [...configDefaults.exclude, ...moduleMockingTests]
        }
      },
      {
        extends: true,
        test: {
          name: 'isolated',
          include: moduleMockingTests,
          sequence: { groupOrder: 1 }
        }
      }
    ],
    environment: 'node',
    clearMocks: true,
    testTimeout: 10000,
    hookTimeout: 60000,
    fileParallelism: true,
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
        'src/domain/**',
        'src/server/auth/types/**',
        'src/server/common/test-helpers/**',
        'src/server/types/**',
        'src/**/types.js'
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
      '~': root
    }
  }
})
