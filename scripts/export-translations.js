import { readFile } from 'node:fs/promises'
// eslint-disable-next-line n/no-unpublished-import
import ExcelJS from 'exceljs'
import { transformToExcelFormat } from './i18next-export-plugin.mjs'

/**
 * Exports untranslated strings to an Excel file
 * @param {string} inputFile - Path to the afterSync results JSON
 * @param {string} outputFile - Path to the Excel output file
 */
async function exportTranslations(inputFile, outputFile) {
  // Read the afterSync results
  const data = await readFile(inputFile, 'utf-8')
  const results = JSON.parse(data)

  // Transform to Excel format (untranslated only)
  const translationData = transformToExcelFormat(results)

  // Create Excel workbook
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet('Translations')

  // Define columns
  worksheet.columns = [
    { header: 'field name', key: 'field name', width: 50 },
    { header: 'en', key: 'en', width: 60 },
    { header: 'cy', key: 'cy', width: 60 }
  ]

  // Style header row
  const headerRow = worksheet.getRow(1)
  headerRow.font = { bold: true }
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFD9D9D9' }
  }

  // Add data rows
  translationData.forEach((row) => {
    worksheet.addRow(row)
  })

  // Write to file
  await workbook.xlsx.writeFile(outputFile)

  // eslint-disable-next-line no-console
  console.log(
    `✓ Exported ${translationData.length} untranslated strings to ${outputFile}`
  )

  return { count: translationData.length, outputFile }
}

export { exportTranslations }

// CLI usage - not covered by tests
/* eslint-disable no-console, promise/prefer-await-to-then, n/no-process-exit */
/* v8 ignore next 9 */
if (import.meta.url === `file://${process.argv[1]}`) {
  const inputFile = process.argv[2] || 'translation-keys.json'
  const outputFile = process.argv[3] || 'translations.xlsx'

  exportTranslations(inputFile, outputFile).catch((error) => {
    console.error('Error exporting translations:', error.message)
    process.exit(1)
  })
}
/* eslint-enable no-console, promise/prefer-await-to-then, n/no-process-exit */
