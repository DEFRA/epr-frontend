/* eslint-disable no-console, n/no-process-exit, n/no-unpublished-import */
import ExcelJS from 'exceljs'
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

/**
 * Set a value at a nested path in an object
 * @param {object} obj - The object to modify
 * @param {string} path - Dot-notation path (e.g., 'footer.getHelp.email')
 * @param {string} value - The value to set
 */
function setNestedValue(obj, path, value) {
  const keys = path.split('.')
  let current = obj

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i]
    if (!(key in current) || typeof current[key] !== 'object') {
      current[key] = {}
    }
    current = current[key]
  }

  current[keys[keys.length - 1]] = value
}

/**
 * Deep merge two objects
 * @param {object} target - Target object
 * @param {object} source - Source object to merge in
 * @returns {object} Merged object
 */
function deepMerge(target, source) {
  const result = { ...target }

  for (const key of Object.keys(source)) {
    if (
      source[key] &&
      typeof source[key] === 'object' &&
      !Array.isArray(source[key]) &&
      target[key] &&
      typeof target[key] === 'object' &&
      !Array.isArray(target[key])
    ) {
      result[key] = deepMerge(target[key], source[key])
    } else {
      result[key] = source[key]
    }
  }

  return result
}

/**
 * Flatten nested object keys to dot-notation strings
 * @param {object} obj - The object to flatten
 * @param {string} prefix - Current key prefix
 * @returns {string[]} Array of dot-notation keys
 */
function flattenKeys(obj, prefix = '') {
  const keys = []

  for (const key of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key

    if (obj[key] && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
      keys.push(...flattenKeys(obj[key], fullKey))
    } else {
      keys.push(fullKey)
    }
  }

  return keys
}

/**
 * Parse args to get input file
 * @param {string[]} args
 * @returns {string}
 */
function parseArgs(args) {
  const importFileURLIndex = args.indexOf('--importFileURL')
  const hasImportFileURL =
    importFileURLIndex >= 0 && args[importFileURLIndex + 1]

  if (hasImportFileURL) {
    return args[importFileURLIndex + 1]
  }

  const inIndex = args.indexOf('--in')
  const hasInputArg = inIndex >= 0 && args[inIndex + 1]
  return hasInputArg ? args[inIndex + 1] : 'import-translations.xlsx'
}

/**
 * Import Welsh translations from Excel file to cy.json files
 * @param {string} inputFile
 * @returns {Promise<void>}
 */
async function importTranslations(inputFile) {
  const inputPath = join(__dirname, '..', inputFile)

  console.log(`Reading ${inputFile}...`)
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.readFile(inputPath)

  const worksheet = workbook.getWorksheet(1)
  if (!worksheet) {
    throw new Error(`No worksheet found in ${inputFile}`)
  }

  const headerRow = worksheet.getRow(1)
  const headers = headerRow.values
  const fieldNameCol = headers.findIndex(
    (h) => h?.toString().toLowerCase() === 'field name'
  )
  const cyCol = headers.findIndex((h) => h?.toString().toLowerCase() === 'cy')

  if (fieldNameCol === -1 || cyCol === -1) {
    throw new Error('Could not find required columns (field name, cy)')
  }

  const translationsByNamespace = new Map()

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return

    const fieldName = row.getCell(fieldNameCol).value?.toString()
    const cyValue = row.getCell(cyCol).value?.toString()

    if (!fieldName || !cyValue) return

    const parts = fieldName.split(':')
    if (parts.length < 2) {
      console.warn(`Skipping invalid field name: ${fieldName}`)
      return
    }

    const namespace = parts[0]
    const key = parts.slice(1).join(':')

    if (!translationsByNamespace.has(namespace)) {
      translationsByNamespace.set(namespace, {})
    }

    setNestedValue(translationsByNamespace.get(namespace), key, cyValue)
  })

  console.log(`Found ${translationsByNamespace.size} namespaces`)

  let updatedFiles = 0
  for (const [namespace, translations] of translationsByNamespace) {
    const cyFilePath = join(
      __dirname,
      '..',
      'src',
      'server',
      namespace,
      'cy.json'
    )
    const enFilePath = join(
      __dirname,
      '..',
      'src',
      'server',
      namespace,
      'en.json'
    )

    try {
      let existingTranslations = {}
      try {
        const content = await readFile(cyFilePath, 'utf-8')
        existingTranslations = JSON.parse(content)
      } catch {
        // File doesn't exist or is invalid, start fresh
      }

      // Check for unknown keys by comparing against en.json
      try {
        const enContent = await readFile(enFilePath, 'utf-8')
        const enTranslations = JSON.parse(enContent)
        const enKeys = flattenKeys(enTranslations)
        const importKeys = flattenKeys(translations)

        for (const key of importKeys) {
          if (!enKeys.includes(key)) {
            console.warn(
              `Warning: Unknown key '${key}' in namespace '${namespace}' - not found in en.json`
            )
          }
        }
      } catch {
        console.warn(
          `Warning: Could not read ${namespace}/en.json to validate keys`
        )
      }

      const mergedTranslations = deepMerge(existingTranslations, translations)

      await writeFile(
        cyFilePath,
        JSON.stringify(mergedTranslations, null, 2) + '\n',
        'utf-8'
      )

      console.log(
        `Updated ${namespace}/cy.json (${Object.keys(translations).length} translations)`
      )
      updatedFiles++
    } catch (error) {
      console.error(`Failed to update ${namespace}/cy.json:`, error.message)
    }
  }

  console.log(`Imported translations to ${updatedFiles} files`)
}

/* v8 ignore next 9 */
if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const inputFile = parseArgs(process.argv.slice(2))
    await importTranslations(inputFile)
  } catch (error) {
    console.error('Error:', error.message)
    process.exit(1)
  }
}

export { importTranslations, parseArgs, setNestedValue, deepMerge, flattenKeys }
