// eslint-disable-next-line n/no-unpublished-import
import { glob } from 'glob'
import { readFile } from 'node:fs/promises'

/**
 * Returns an i18next-cli Plugin that extracts translation keys from Nunjucks files.
 * @returns {import('i18next-cli').Plugin} The plugin instance.
 */
export default function nunjucksPlugin() {
  return {
    name: 'nunjucks-plugin',
    version: '1.0.0',

    async onEnd(keys) {
      const nunjucksFiles = await glob('src/**/*.njk')
      const functionRegex =
        /(localise|t)\s*\(\s*["']([^"']+)["']\s*(?:,\s*[^)]*)?\)/g

      for (const file of nunjucksFiles) {
        const content = await readFile(file, 'utf-8')

        for (const match of content.matchAll(functionRegex)) {
          const key = match[2]
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
