import { readFile } from 'node:fs/promises'
import { execSync } from 'node:child_process'
// eslint-disable-next-line n/no-unpublished-import
import ExcelJS from 'exceljs'
import { transformToExcelFormat } from './i18next-export-plugin.mjs'

/**
 * @param {string} inputFile
 * @param {string} outputFile
 */
async function exportTranslations(inputFile, outputFile) {
  const data = await readFile(inputFile, 'utf-8')
  const results = JSON.parse(data)
  const translationData = transformToExcelFormat(results)

  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet('Translations')

  worksheet.columns = [
    { header: 'field name', key: 'field name', width: 50 },
    { header: 'en', key: 'en', width: 60 },
    { header: 'cy', key: 'cy', width: 60 }
  ]

  const headerRow = worksheet.getRow(1)
  headerRow.font = { bold: true }
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFD9D9D9' }
  }

  translationData.forEach((row) => {
    worksheet.addRow(row)
  })

  await workbook.xlsx.writeFile(outputFile)

  const message =
    translationData.length === 0
      ? '✓ No untranslated strings found. All translations are in sync!'
      : `✓ Exported ${translationData.length} untranslated string${translationData.length === 1 ? '' : 's'} to ${outputFile}`

  // eslint-disable-next-line no-console
  console.log(message)

  return { count: translationData.length, outputFile }
}

/* v8 ignore next 10 */
async function runExtraction() {
  try {
    // eslint-disable-next-line no-console
    console.log('🔍 Extracting translation keys...')
    execSync('npx i18next-cli extract', { stdio: 'inherit' })
    // eslint-disable-next-line no-console
    console.log('✓ Extraction complete\n')
  } catch (error) {
    throw new Error(
      `Failed to extract translation keys. Please check your i18next.config.ts configuration.\nError: ${error.message}`
    )
  }
}

/**
 * @param {string[]} args
 * @returns {{ outputFile: string }}
 */
function parseArgs(args) {
  const outIndex = args.indexOf('--out')
  const hasOutputArg = outIndex >= 0 && args[outIndex + 1]
  const outputFile = hasOutputArg ? args[outIndex + 1] : 'translations.xlsx'

  return { outputFile }
}

export { exportTranslations, runExtraction, parseArgs }

/* eslint-disable no-console, promise/prefer-await-to-then, n/no-process-exit */
/* v8 ignore next 16 */
if (import.meta.url === `file://${process.argv[1]}`) {
  const { outputFile } = parseArgs(process.argv.slice(2))
  const inputFile = 'translation-keys.json'

  runExtraction()
    .then(() => exportTranslations(inputFile, outputFile))
    .catch((error) => {
      console.error('❌ Error:', error.message)
      if (error.code === 'ENOENT') {
        console.error(
          '\n💡 Tip: Make sure the file paths exist and you have write permissions.'
        )
      }
      process.exit(1)
    })
}
/* eslint-enable no-console, promise/prefer-await-to-then, n/no-process-exit */
