import { defineConfig } from 'i18next-cli'
// eslint-disable-next-line n/no-missing-import
import nunjucksPlugin from './scripts/i18next-nunjucks-plugin.mjs'
// eslint-disable-next-line n/no-missing-import
import exportPlugin from './scripts/i18next-export-plugin.mjs'

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
  sync: {
    input: [
      'src/server/account/{{language}}.json',
      'src/server/auth/{{language}}.json',
      'src/server/common/{{language}}.json',
      'src/server/error/{{language}}.json',
      'src/server/home/{{language}}.json',
      'src/server/login/{{language}}.json',
      'src/server/logout/{{language}}.json',
      'src/server/registration/{{language}}.json',
      'src/server/summary-log/{{language}}.json',
      'src/server/summary-log-upload/{{language}}.json'
    ],
    locales: ['en', 'cy'],
    primaryLocale: 'en'
  },
  types: {
    input: ['src/server/**/{{language}}.json'],
    output: 'src/types/i18next.d.ts'
  },
  plugins: [nunjucksPlugin(), exportPlugin({ output: 'translation-keys.json' })]
})
