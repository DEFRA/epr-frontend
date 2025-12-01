import { writeFile } from 'node:fs/promises'
import { join, dirname, basename } from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = dirname(fileURLToPath(import.meta.url))

/**
 * @param {object} obj
 * @param {string} prefix
 * @returns {object}
 */
function flattenObject(obj, prefix = '') {
  const flattened = {}

  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(flattened, flattenObject(value, newKey))
    } else {
      flattened[newKey] = value
    }
  }

  return flattened
}

/**
 * @param {string} filePath
 * @returns {string}
 */
function extractNamespace(filePath) {
  const parts = filePath.split('/')
  const namespaceIndex = parts.indexOf('server') + 1

  if (namespaceIndex > 0 && namespaceIndex < parts.length) {
    return parts[namespaceIndex]
  }

  return basename(filePath, '.json')
}

/**
 * @param {Array} results
 * @returns {Array<object>}
 */
export function transformToExcelFormat(results) {
  const translationMap = new Map()

  for (const result of results) {
    const namespace = extractNamespace(result.path)
    const language = basename(result.path, '.json')
    const flattenedTranslations = flattenObject(result.newTranslations)

    for (const [key, value] of Object.entries(flattenedTranslations)) {
      const fieldName = `${namespace}:${key}`

      if (!translationMap.has(fieldName)) {
        translationMap.set(fieldName, {
          'field name': fieldName,
          en: '',
          cy: ''
        })
      }

      translationMap.get(fieldName)[language] = value ?? ''
    }
  }

  const allTranslations = Array.from(translationMap.values())
  const untranslated = allTranslations.filter((entry) => {
    const hasEnglish = typeof entry.en === 'string' && entry.en.trim() !== ''
    const missingWelsh = !entry.cy || entry.cy.trim() === ''
    return hasEnglish && missingWelsh
  })

  return untranslated.sort((a, b) =>
    a['field name'].localeCompare(b['field name'])
  )
}

/**
 * @param {object} options
 * @param {string} options.output
 * @returns {import('i18next-cli').Plugin}
 */
export default function exportPlugin(options = {}) {
  const { output = 'translation-keys.json' } = options

  return {
    name: 'export-plugin',
    version: '1.0.0',

    async afterSync(results) {
      const outputPath = join(currentDir, '..', output)
      await writeFile(outputPath, JSON.stringify(results, null, 2))
      console.log(`\n✓ Exported translation keys to ${output}`)
    }
  }
}
