import NunjucksLexer from './scripts/nunjucks-lexer.js'

export default {
  locales: ['en', 'cy'],
  output: 'src/server/$NAMESPACE/$LOCALE.json',
  input: ['src/server/**/*.js', 'src/server/**/*.njk', 'src/config/**/*.js'],
  exclude: ['**/*.test.js', '**/test-helpers/**', '.server/**', '.public/**'],

  lexers: {
    js: [
      {
        lexer: 'JavascriptLexer',
        functions: ['t', 'localise'],
        namespaceFunctions: ['useTranslation', 'withTranslation']
      }
    ],
    njk: [
      {
        lexer: NunjucksLexer,
        functions: ['t', 'localise']
      }
    ],
    nunjucks: [
      {
        lexer: NunjucksLexer,
        functions: ['t', 'localise']
      }
    ]
  },

  defaultNamespace: 'common',
  namespaceSeparator: ':',
  keySeparator: '.',
  keepRemoved: true,
  sort: true,
  createOldCatalogs: false,
  failOnWarnings: false,
  failOnUpdate: false,

  defaultValue: (locale, namespace, key) => {
    if (locale === 'cy') return ''
    return key
  },

  indentation: 2,
  useKeysAsDefaultValue: false,
  verbose: true,
  customValueTemplate: null,
  resetDefaultValueLocale: null,
  contextSeparator: '_',
  pluralSeparator: '_'
}
