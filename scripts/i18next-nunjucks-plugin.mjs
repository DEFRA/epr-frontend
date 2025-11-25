// eslint-disable-next-line n/no-unpublished-import
import { glob } from 'glob'
import { readFile } from 'node:fs/promises'

/**
 * i18next-cli plugin for parsing Nunjucks templates
 * @returns {import('i18next-cli').Plugin} i18next-cli plugin instance
 */
export default function nunjucksPlugin() {
  return {
    name: 'nunjucks-plugin',
    version: '1.0.0',

    async onEnd(keys) {
      const nunjucksFiles = await glob('src/**/*.njk')

      for (const file of nunjucksFiles) {
        const content = await readFile(file, 'utf-8')
        const functionRegex =
          /(localise|t)\s*\(\s*["']([^"']+)["']\s*(?:,\s*[^)]*)?\)/g

        for (const match of content.matchAll(functionRegex)) {
          const key = match[2]

          // Convert colons to dots after the namespace separator
          // e.g., "home:services:accreditations" -> "home:services.accreditations"
          const firstColonIndex = key.indexOf(':')
          let namespace = 'common'
          let transformedKey = key

          if (firstColonIndex !== -1) {
            namespace = key.substring(0, firstColonIndex)
            const remainingKey = key.substring(firstColonIndex + 1)
            transformedKey = remainingKey.replace(/:/g, '.')
          }

          keys.set(`${namespace}:${transformedKey}`, {
            key: transformedKey,
            defaultValue: '',
            ns: namespace
          })
        }
      }
    }
  }
}
