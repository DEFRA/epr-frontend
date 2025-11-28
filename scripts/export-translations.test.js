import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { writeFile, mkdir, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { existsSync } from 'node:fs'
import ExcelJS from 'exceljs'
import { exportTranslations } from './export-translations.js'

const TEST_DIR = 'test-export-fixtures'

describe(exportTranslations, () => {
  beforeEach(async () => {
    await mkdir(TEST_DIR, { recursive: true })
  })

  afterEach(async () => {
    await rm(TEST_DIR, { recursive: true, force: true })
  })

  it('should export untranslated strings to Excel', async () => {
    /* eslint-disable vitest/max-expects */
    const inputFile = join(TEST_DIR, 'input.json')
    const outputFile = join(TEST_DIR, 'output.xlsx')

    const mockData = [
      {
        path: '/test/src/server/home/en.json',
        newTranslations: { title: 'Home', greeting: 'Hello' }
      },
      {
        path: '/test/src/server/home/cy.json',
        newTranslations: { title: '', greeting: '' }
      }
    ]

    await writeFile(inputFile, JSON.stringify(mockData))

    const result = await exportTranslations(inputFile, outputFile)

    expect(result.count).toBe(2)
    expect(result.outputFile).toBe(outputFile)
    expect(existsSync(outputFile)).toBe(true)

    // Verify Excel content
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.readFile(outputFile)

    const worksheet = workbook.getWorksheet('Translations')

    expect(worksheet.rowCount).toBe(3) // Header + 2 rows

    const row1 = worksheet.getRow(2)

    expect(row1.getCell(1).value).toBe('home:greeting')
    expect(row1.getCell(2).value).toBe('Hello')
    expect(row1.getCell(3).value).toBe('')
    /* eslint-enable vitest/max-expects */
  })

  it('should handle empty input', async () => {
    const inputFile = join(TEST_DIR, 'empty.json')
    const outputFile = join(TEST_DIR, 'empty.xlsx')

    await writeFile(inputFile, JSON.stringify([]))

    const result = await exportTranslations(inputFile, outputFile)

    expect(result.count).toBe(0)
    expect(existsSync(outputFile)).toBe(true)
  })

  it('should filter out already translated strings', async () => {
    const inputFile = join(TEST_DIR, 'filtered.json')
    const outputFile = join(TEST_DIR, 'filtered.xlsx')

    const mockData = [
      {
        path: '/test/src/server/test/en.json',
        newTranslations: { translated: 'Done', untranslated: 'Todo' }
      },
      {
        path: '/test/src/server/test/cy.json',
        newTranslations: { translated: 'Wedi gwneud', untranslated: '' }
      }
    ]

    await writeFile(inputFile, JSON.stringify(mockData))

    const result = await exportTranslations(inputFile, outputFile)

    expect(result.count).toBe(1) // Only untranslated

    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.readFile(outputFile)
    const worksheet = workbook.getWorksheet('Translations')

    expect(worksheet.rowCount).toBe(2) // Header + 1 row

    const row = worksheet.getRow(2)

    expect(row.getCell(1).value).toBe('test:untranslated')
  })

  it('should handle errors gracefully', async () => {
    const inputFile = join(TEST_DIR, 'nonexistent.json')
    const outputFile = join(TEST_DIR, 'output.xlsx')

    await expect(exportTranslations(inputFile, outputFile)).rejects.toThrow(
      'ENOENT'
    )
  })
})
