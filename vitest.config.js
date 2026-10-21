import { globSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { configDefaults, defineConfig } from 'vitest/config'

const root = fileURLToPath(new URL('.', import.meta.url))

const changesSharedState = (file) =>
  /vi\.(mock|doMock|resetModules|stubEnv)\(|config\.(set|load)\(/.test(
    readFileSync(`${root}${file}`, 'utf8')
  )

// Most test files share one module graph per worker. A file that mocks
// modules or changes config or env would leak into the files after it, and
// modules that read config when first loaded would keep whatever it set, so
// those files run isolated, after the shared ones.
const testsNeedingIsolation = globSync('{src,scripts}/**/*.test.js', {
  cwd: root
}).filter(changesSharedState)

export default defineConfig({
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'shared',
          isolate: false,
          sequence: { groupOrder: 0 },
          exclude: [...configDefaults.exclude, ...testsNeedingIsolation]
        }
      },
      {
        extends: true,
        test: {
          name: 'isolated',
          include: testsNeedingIsolation,
          sequence: { groupOrder: 1 }
        }
      }
    ],
    environment: 'node',
    clearMocks: true,
    unstubGlobals: true,
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
