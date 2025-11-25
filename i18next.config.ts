import { defineConfig } from 'i18next-cli'
// eslint-disable-next-line n/no-missing-import
import nunjucksPlugin from './scripts/i18next-nunjucks-plugin.mjs'

export default defineConfig({
  locales: ['en', 'cy'],
  extract: {
    input: ['src/server/**/*.js', 'src/config/**/*.js'],
    ignore: [
      '**/*.test.js',
      '**/test-helpers/**',
      '.server/**',
      '.public/**',
      '**/*.json'
    ],
    output: 'src/server/{{namespace}}/{{language}}.json',
    defaultNS: 'common',
    keySeparator: '.',
    nsSeparator: ':',
    contextSeparator: '_',
    pluralSeparator: '_',
    functions: ['t', '*.t', 'localise'],
    transComponents: ['Trans'],
    sort: true,
    removeUnusedKeys: false,
    indentation: 2,
    defaultValue: ''
  },
  types: {
    input: ['src/server/**/{{language}}.json'],
    output: 'src/types/i18next.d.ts'
  },
  plugins: [nunjucksPlugin()]
})
