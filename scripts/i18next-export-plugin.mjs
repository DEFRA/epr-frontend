import { writeFile } from 'node:fs/promises'
import { join, dirname, basename } from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = dirname(fileURLToPath(import.meta.url))

/**
 * Flattens a nested object into dot notation
 * @param {object} obj - Object to flatten
 * @param {string} prefix - Prefix for keys
 * @returns {object} Flattened object
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
 * Extracts namespace from file path
 * @param {string} filePath - File path (e.g., "/path/to/src/server/home/en.json")
 * @returns {string} Namespace (e.g., "home")
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
 * Transforms afterSync results into Excel-ready JSON format with ONLY untranslated strings
 * Based on ADR 0022 - columns: "field name" | "en" | "cy"
 *
 * Filters to include only entries where:
 * - English translation exists and is not empty
 * - Welsh translation is missing or empty
 * @param {Array} results - afterSync results from i18next-cli
 * @returns {Array<object>} Excel-ready data with only untranslated entries (field name, en, cy)
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
 * i18next-cli plugin for exporting translation keys to JSON
 * @param {object} options - Plugin options
 * @param {string} options.output - Output file path (default: 'translation-keys.json')
 * @returns {import('i18next-cli').Plugin} i18next-cli plugin instance
 */
export default function exportPlugin(options = {}) {
  const { output = 'translation-keys.json' } = options

  return {
    name: 'export-plugin',
    version: '1.0.0',

    async afterSync(results) {
      // Export raw results to JSON for further processing
      const outputPath = join(currentDir, '..', output)
      await writeFile(outputPath, JSON.stringify(results, null, 2))

      console.log(`\n✓ Exported translation keys to ${output}`)
    }
  }
}
