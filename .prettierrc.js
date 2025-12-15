/**
 * @type {Options}
 */
export default {
  tabWidth: 2,
  semi: false,
  singleQuote: true,
  trailingComma: 'none',
  overrides: [
    {
      files: ['src/server/**/en.json', 'src/server/**/cy.json'],
      options: {
        plugins: ['prettier-plugin-sort-json'],
        jsonRecursiveSort: true
      }
    }
  ]
}

/**
 * @import { Options } from 'prettier'
 */
