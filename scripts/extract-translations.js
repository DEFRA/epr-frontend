import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// eslint-disable-next-line n/no-unpublished-import
import ExcelJS from 'exceljs/dist/es5/exceljs.browser.js'

import {
  findNamespaces,
  flattenKeys,
  readTranslationFiles
} from '../src/utils/translation/translation-utils.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * Parse command line arguments to extract the output path
 */
export function parseArgs(args = process.argv.slice(2)) {
  const outIndex = args.indexOf('--out')

  if (outIndex === -1 || !args[outIndex + 1]) {
    throw new Error(
      '--out argument is required\n' +
        'Usage: npm run export-translations -- --out <output-path>\n' +
        'Example: npm run export-translations -- --out ./translations-export.xlsx'
    )
  }

  return {
    outputPath: args[outIndex + 1]
  }
}

/**
 * Extract translations that are missing or out of sync between en.json and cy.json
 * Returns array of objects with field, en, and cy values
 */
export function extractMissingTranslations(baseDir) {
  const namespaces = findNamespaces(baseDir)
  const missingTranslations = []

  for (const { namespace, path: nsPath } of namespaces) {
    const { en, cy, enExists, cyExists } = readTranslationFiles(nsPath)

    /* c8 ignore next 3 */
    if (!enExists && !cyExists) {
      continue
    }

    const enData = flattenKeys(en)
    const cyData = flattenKeys(cy)

    const allKeys = new Set([...Object.keys(enData), ...Object.keys(cyData)])

    for (const key of allKeys) {
      const enValue = enData[key] || ''
      const cyValue = cyData[key] || ''

      if (!enValue || !cyValue) {
        missingTranslations.push({
          field: `${namespace}:${key}`,
          en: enValue,
          cy: cyValue
        })
      }
    }
  }

  return missingTranslations
}

/**
 * Write translation data to Excel file with columns: field | en | cy
 */
export async function writeToExcel(data, outputPath) {
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet('Translations')

  worksheet.columns = [
    { header: 'field', key: 'field', width: 50 },
    { header: 'en', key: 'en', width: 50 },
    { header: 'cy', key: 'cy', width: 50 }
  ]

  worksheet.getRow(1).font = { bold: true }

  data.forEach((row) => {
    worksheet.addRow(row)
  })

  const outputDir = path.dirname(outputPath)
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  await workbook.xlsx.writeFile(outputPath)
}

/**
 * Main execution: parse args, extract missing translations, and export to Excel
 */
export async function main() {
  const { outputPath } = parseArgs()
  const baseDir = path.resolve(__dirname, '../src/server')

  if (!fs.existsSync(baseDir)) {
    throw new Error(`Directory ${baseDir} does not exist`)
  }

  const missingTranslations = extractMissingTranslations(baseDir)

  await writeToExcel(missingTranslations, outputPath)

  // eslint-disable-next-line no-console
  console.log(
    `✅ Exported ${missingTranslations.length} missing translation${missingTranslations.length !== 1 ? 's' : ''} → ${outputPath}`
  )
}

/**
 * Run the script and handle errors
 */
export async function run() {
  try {
    await main()
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`❌ ${error.message}`)
    process.exitCode = 1
  }
}

/* c8 ignore next 3 */
if (import.meta.url === `file://${process.argv[1]}`) {
  await run()
}
