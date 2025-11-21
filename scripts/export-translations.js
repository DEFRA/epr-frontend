/* eslint-disable no-console */
import { readdir, readFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
// eslint-disable-next-line n/no-unpublished-import
import ExcelJS from 'exceljs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SERVER_DIR = join(__dirname, '..', 'src', 'server')

/**
 * Flatten nested JSON object into dot notation
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
 * Discover all namespaces by finding directories with en.json files
 * @returns {Promise<string[]>} Array of namespace names
 */
async function discoverNamespaces() {
  const namespaces = []
  const entries = await readdir(SERVER_DIR, { withFileTypes: true })

  for (const entry of entries) {
    if (entry.isDirectory()) {
      try {
        const enPath = join(SERVER_DIR, entry.name, 'en.json')
        await readFile(enPath, 'utf8')
        namespaces.push(entry.name)
      } catch {
        // No en.json file, skip this directory
      }
    }
  }

  return namespaces.sort()
}

/**
 * Load translation file
 * @param {string} namespace - Namespace name
 * @param {string} locale - Locale (en or cy)
 * @returns {Promise<object>} Translation object
 */
async function loadTranslations(namespace, locale) {
  try {
    const filePath = join(SERVER_DIR, namespace, `${locale}.json`)
    const content = await readFile(filePath, 'utf8')
    return JSON.parse(content)
  } catch {
    return {}
  }
}

/**
 * Generate Excel file with translations
 */
async function generateExcel() {
  console.log('Discovering namespaces...')
  const namespaces = await discoverNamespaces()
  console.log(`Found ${namespaces.length} namespaces: ${namespaces.join(', ')}`)

  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet('Translations')

  worksheet.columns = [
    { header: 'field name', key: 'fieldName', width: 40 },
    { header: 'en', key: 'en', width: 60 },
    { header: 'cy', key: 'cy', width: 60 }
  ]

  worksheet.getRow(1).font = { bold: true }
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFD3D3D3' }
  }

  let totalKeys = 0
  let missingTranslations = 0

  for (const namespace of namespaces) {
    console.log(`Processing namespace: ${namespace}`)
    const enTranslations = await loadTranslations(namespace, 'en')
    const cyTranslations = await loadTranslations(namespace, 'cy')

    const flattenedEn = flattenObject(enTranslations)
    const flattenedCy = flattenObject(cyTranslations)

    for (const [key, enValue] of Object.entries(flattenedEn)) {
      const cyValue = flattenedCy[key] || ''
      totalKeys++

      if (!cyValue) {
        const fieldName = `${namespace}:${key}`
        worksheet.addRow({
          fieldName,
          en: enValue,
          cy: cyValue
        })
        missingTranslations++
      }
    }
  }

  worksheet.autoFilter = {
    from: 'A1',
    to: 'C1'
  }

  const outputPath = join(__dirname, '..', 'translations.xlsx')
  await workbook.xlsx.writeFile(outputPath)

  console.log('\n✓ Excel file generated successfully!')
  console.log(`  Output: ${outputPath}`)
  console.log(`  Total keys: ${totalKeys}`)
  console.log(`  Missing Welsh translations (exported): ${missingTranslations}`)
  console.log(
    `\nNote: Only missing translations (empty cy column) are included in the export.`
  )
}

generateExcel().catch((error) => {
  console.error('Error generating Excel file:', error)
  throw error
})
