import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { existsSync, unlinkSync } from 'node:fs'
import { writeFile, readFile, mkdir, rm } from 'node:fs/promises'
import ExcelJS from 'exceljs'
import { importTranslations, parseArgs } from './import-translations.js'

const currentDir = dirname(fileURLToPath(import.meta.url))
const testSrcDir = join(currentDir, '..', 'src', 'server')
const projectRoot = join(currentDir, '..')

describe('import-translations', () => {
  describe(parseArgs, () => {
    it('should parse --importFileURL argument', () => {
      const result = parseArgs(['--importFileURL', 'custom-import.xlsx'])

      expect(result).toBe('custom-import.xlsx')
    })

    it('should parse --in argument for backwards compatibility', () => {
      const result = parseArgs(['--in', 'legacy-import.xlsx'])

      expect(result).toBe('legacy-import.xlsx')
    })

    it('should prefer --importFileURL over --in when both are present', () => {
      const result = parseArgs([
        '--in',
        'legacy.xlsx',
        '--importFileURL',
        'new.xlsx'
      ])

      expect(result).toBe('new.xlsx')
    })

    it('should default to import-translations.xlsx when no arguments provided', () => {
      const result = parseArgs([])

      expect(result).toBe('import-translations.xlsx')
    })

    it('should default to import-translations.xlsx when --importFileURL flag exists but no value', () => {
      const result = parseArgs(['--importFileURL'])

      expect(result).toBe('import-translations.xlsx')
    })
  })

  describe(importTranslations, () => {
    let testExcelPath
    const testNamespaces = []

    beforeEach(() => {
      testNamespaces.length = 0
    })

    afterEach(async () => {
      if (testExcelPath && existsSync(testExcelPath)) {
        unlinkSync(testExcelPath)
      }

      for (const namespace of testNamespaces) {
        const namespaceDir = join(testSrcDir, namespace)
        if (existsSync(namespaceDir)) {
          await rm(namespaceDir, { recursive: true, force: true })
        }
      }
    })

    /**
     * Helper to create an Excel file for testing
     * @param {string} filename
     * @param {Array<{fieldName: string, en?: string, cy: string}>} rows
     * @returns {Promise<string>}
     */
    async function createTestExcel(filename, rows) {
      const workbook = new ExcelJS.Workbook()
      const worksheet = workbook.addWorksheet('Sheet1')

      worksheet.addRow(['field name', 'en', 'cy'])

      rows.forEach((row) => {
        worksheet.addRow([row.fieldName, row.en || '', row.cy || ''])
      })

      const filePath = join(projectRoot, filename)
      await workbook.xlsx.writeFile(filePath)
      return filePath
    }

    /**
     * Helper to register a test namespace for cleanup
     * @param {string} namespace
     */
    function registerNamespace(namespace) {
      if (!testNamespaces.includes(namespace)) {
        testNamespaces.push(namespace)
      }
    }

    it('should import Welsh translations from Excel file', async () => {
      registerNamespace('test-import-home')

      testExcelPath = await createTestExcel('test-import.xlsx', [
        { fieldName: 'test-import-home:pageTitle', en: 'Home', cy: 'Hafan' },
        { fieldName: 'test-import-home:heading', en: 'Welcome', cy: 'Croeso' }
      ])

      const homeDir = join(testSrcDir, 'test-import-home')
      await mkdir(homeDir, { recursive: true })

      await importTranslations('test-import.xlsx')

      const cyFilePath = join(homeDir, 'cy.json')

      expect(existsSync(cyFilePath)).toBe(true)

      const content = await readFile(cyFilePath, 'utf-8')
      const translations = JSON.parse(content)

      expect(translations).toStrictEqual({
        pageTitle: 'Hafan',
        heading: 'Croeso'
      })
    })

    it('should merge with existing translations', async () => {
      registerNamespace('test-merge-home')

      testExcelPath = await createTestExcel('test-merge.xlsx', [
        { fieldName: 'test-merge-home:newKey', en: 'New', cy: 'Newydd' }
      ])

      const homeDir = join(testSrcDir, 'test-merge-home')
      await mkdir(homeDir, { recursive: true })
      const cyFilePath = join(homeDir, 'cy.json')
      await writeFile(
        cyFilePath,
        JSON.stringify({ existingKey: 'Hen' }, null, 2),
        'utf-8'
      )

      await importTranslations('test-merge.xlsx')

      const content = await readFile(cyFilePath, 'utf-8')
      const translations = JSON.parse(content)

      expect(translations).toStrictEqual({
        existingKey: 'Hen',
        newKey: 'Newydd'
      })
    })

    it('should handle multiple namespaces', async () => {
      registerNamespace('test-multi-home')
      registerNamespace('test-multi-account')

      testExcelPath = await createTestExcel('test-multi.xlsx', [
        { fieldName: 'test-multi-home:title', en: 'Home', cy: 'Hafan' },
        {
          fieldName: 'test-multi-account:title',
          en: 'Account',
          cy: 'Cyfrif'
        }
      ])

      await mkdir(join(testSrcDir, 'test-multi-home'), { recursive: true })
      await mkdir(join(testSrcDir, 'test-multi-account'), { recursive: true })

      await importTranslations('test-multi.xlsx')

      const homeTranslations = JSON.parse(
        await readFile(join(testSrcDir, 'test-multi-home', 'cy.json'), 'utf-8')
      )
      const accountTranslations = JSON.parse(
        await readFile(
          join(testSrcDir, 'test-multi-account', 'cy.json'),
          'utf-8'
        )
      )

      expect(homeTranslations).toStrictEqual({ title: 'Hafan' })
      expect(accountTranslations).toStrictEqual({ title: 'Cyfrif' })
    })

    it('should skip rows with missing data', async () => {
      registerNamespace('test-skip-home')

      testExcelPath = await createTestExcel('test-skip.xlsx', [
        { fieldName: '', cy: 'Should be skipped' },
        { fieldName: 'test-skip-home:empty', cy: '' },
        { fieldName: 'test-skip-home:valid', en: 'Valid', cy: 'Dilys' }
      ])

      const homeDir = join(testSrcDir, 'test-skip-home')
      await mkdir(homeDir, { recursive: true })

      await importTranslations('test-skip.xlsx')

      const content = await readFile(join(homeDir, 'cy.json'), 'utf-8')
      const translations = JSON.parse(content)

      expect(translations).toStrictEqual({ valid: 'Dilys' })
    })

    it('should handle field names with colons in the key', async () => {
      registerNamespace('test-colons-common')

      testExcelPath = await createTestExcel('test-colons.xlsx', [
        {
          fieldName: 'test-colons-common:error:validation:required',
          en: 'Required',
          cy: 'Gofynnol'
        }
      ])

      const commonDir = join(testSrcDir, 'test-colons-common')
      await mkdir(commonDir, { recursive: true })

      await importTranslations('test-colons.xlsx')

      const content = await readFile(join(commonDir, 'cy.json'), 'utf-8')
      const translations = JSON.parse(content)

      expect(translations).toStrictEqual({
        'error:validation:required': 'Gofynnol'
      })
    })

    it('should skip invalid field names without colon separator', async () => {
      registerNamespace('test-invalid-home')

      testExcelPath = await createTestExcel('test-invalid.xlsx', [
        { fieldName: 'invalidnocolon', cy: 'Should be skipped' },
        { fieldName: 'test-invalid-home:valid', en: 'Valid', cy: 'Dilys' }
      ])

      const homeDir = join(testSrcDir, 'test-invalid-home')
      await mkdir(homeDir, { recursive: true })

      await importTranslations('test-invalid.xlsx')

      const content = await readFile(join(homeDir, 'cy.json'), 'utf-8')
      const translations = JSON.parse(content)

      expect(translations).toStrictEqual({ valid: 'Dilys' })
    })

    it('should create cy.json if it does not exist', async () => {
      registerNamespace('test-create-newmodule')

      testExcelPath = await createTestExcel('test-create.xlsx', [
        { fieldName: 'test-create-newmodule:key', en: 'Key', cy: 'Allwedd' }
      ])

      const newModuleDir = join(testSrcDir, 'test-create-newmodule')
      await mkdir(newModuleDir, { recursive: true })

      await importTranslations('test-create.xlsx')

      const cyFilePath = join(newModuleDir, 'cy.json')

      expect(existsSync(cyFilePath)).toBe(true)

      const content = await readFile(cyFilePath, 'utf-8')
      const translations = JSON.parse(content)

      expect(translations).toStrictEqual({ key: 'Allwedd' })
    })

    it('should handle invalid JSON in existing cy.json', async () => {
      registerNamespace('test-invalid-json-home')

      testExcelPath = await createTestExcel('test-invalid-json.xlsx', [
        { fieldName: 'test-invalid-json-home:key', en: 'Key', cy: 'Allwedd' }
      ])

      const homeDir = join(testSrcDir, 'test-invalid-json-home')
      await mkdir(homeDir, { recursive: true })
      const cyFilePath = join(homeDir, 'cy.json')
      await writeFile(cyFilePath, 'invalid json{{{', 'utf-8')

      await importTranslations('test-invalid-json.xlsx')

      const content = await readFile(cyFilePath, 'utf-8')
      const translations = JSON.parse(content)

      expect(translations).toStrictEqual({ key: 'Allwedd' })
    })

    it('should continue processing other namespaces if one fails', async () => {
      registerNamespace('test-partial-home')

      testExcelPath = await createTestExcel('test-partial.xlsx', [
        { fieldName: 'nonexistent-test:key', en: 'Key', cy: 'Allwedd' },
        { fieldName: 'test-partial-home:key', en: 'Key', cy: 'Allwedd' }
      ])

      const homeDir = join(testSrcDir, 'test-partial-home')
      await mkdir(homeDir, { recursive: true })

      await importTranslations('test-partial.xlsx')

      const cyFilePath = join(homeDir, 'cy.json')

      expect(existsSync(cyFilePath)).toBe(true)

      const content = await readFile(cyFilePath, 'utf-8')
      const translations = JSON.parse(content)

      expect(translations).toStrictEqual({ key: 'Allwedd' })
    })

    it('should throw error if no worksheet found in Excel file', async () => {
      const workbook = new ExcelJS.Workbook()
      testExcelPath = join(projectRoot, 'empty.xlsx')
      await workbook.xlsx.writeFile(testExcelPath)

      await expect(importTranslations('empty.xlsx')).rejects.toThrowError(
        'No worksheet found in'
      )
    })

    it('should throw error if required columns are missing', async () => {
      const workbook = new ExcelJS.Workbook()
      const worksheet = workbook.addWorksheet('Sheet1')
      worksheet.addRow(['wrong', 'headers', 'cy'])
      testExcelPath = join(projectRoot, 'wrong-headers.xlsx')
      await workbook.xlsx.writeFile(testExcelPath)

      await expect(
        importTranslations('wrong-headers.xlsx')
      ).rejects.toThrowError('Could not find required columns')
    })

    it('should handle case-insensitive column headers', async () => {
      registerNamespace('test-uppercase-home')

      const workbook = new ExcelJS.Workbook()
      const worksheet = workbook.addWorksheet('Sheet1')
      worksheet.addRow(['FIELD NAME', 'EN', 'CY'])
      worksheet.addRow(['test-uppercase-home:title', 'Home', 'Hafan'])
      testExcelPath = join(projectRoot, 'uppercase.xlsx')
      await workbook.xlsx.writeFile(testExcelPath)

      const homeDir = join(testSrcDir, 'test-uppercase-home')
      await mkdir(homeDir, { recursive: true })

      await importTranslations('uppercase.xlsx')

      const content = await readFile(join(homeDir, 'cy.json'), 'utf-8')
      const translations = JSON.parse(content)

      expect(translations).toStrictEqual({ title: 'Hafan' })
    })
  })
})
