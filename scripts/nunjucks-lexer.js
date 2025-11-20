import { HandlebarsLexer } from 'i18next-parser'

/**
 * Custom lexer for extracting i18next translation keys from Nunjucks templates.
 * Extends HandlebarsLexer since Nunjucks uses similar {{ }} expression syntax.
 */
export default class NunjucksLexer extends HandlebarsLexer {
  constructor(options = {}) {
    super(options)
  }

  extract(content) {
    const keys = []

    const functionPatterns = this.functions.map((func) => {
      const escapedFunc = func.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      return new RegExp(
        `${escapedFunc}\\s*\\(\\s*['"]([^'"]+)['"]\\s*(?:,\\s*[^)]*)?\\)`,
        'g'
      )
    })

    for (const pattern of functionPatterns) {
      let match
      while ((match = pattern.exec(content)) !== null) {
        const key = match[1]

        if (!key) {
          continue
        }

        let namespace = this.defaultNamespace
        let cleanKey = key

        const colonIndex = key.indexOf(':')
        if (colonIndex !== -1) {
          namespace = key.substring(0, colonIndex)
          cleanKey = key.substring(colonIndex + 1).replace(/:/g, '.')
        }

        const entry = {}
        entry[cleanKey] = ''

        keys.push({
          key: cleanKey,
          namespace,
          defaultValue: '',
          ...entry
        })
      }
    }

    return keys
  }
}
