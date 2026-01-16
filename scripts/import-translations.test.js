import { describe, it, expect, afterEach } from 'vitest'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { existsSync, unlinkSync } from 'node:fs'
import { writeFile, readFile, mkdir, rm } from 'node:fs/promises'
import ExcelJS from 'exceljs'
import {
  importTranslations,
  parseArgs,
  setNestedValue,
  deepMerge
} from './import-translations.js'

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

  describe(setNestedValue, () => {
    it('should set a simple key', () => {
      const obj = {}
      setNestedValue(obj, 'key', 'value')

      expect(obj).toStrictEqual({ key: 'value' })
    })

    it('should set a nested key with dot notation', () => {
      const obj = {}
      setNestedValue(obj, 'footer.crownCopyright', 'Crown copyright')

      expect(obj).toStrictEqual({
        footer: { crownCopyright: 'Crown copyright' }
      })
    })

    it('should set a deeply nested key', () => {
      const obj = {}
      setNestedValue(obj, 'footer.getHelp.email', 'test@example.com')

      expect(obj).toStrictEqual({
        footer: { getHelp: { email: 'test@example.com' } }
      })
    })

    it('should preserve existing sibling keys', () => {
      const obj = { footer: { existing: 'value' } }
      setNestedValue(obj, 'footer.newKey', 'new value')

      expect(obj).toStrictEqual({
        footer: { existing: 'value', newKey: 'new value' }
      })
    })

    it('should overwrite non-object intermediate values', () => {
      const obj = { footer: 'string value' }
      setNestedValue(obj, 'footer.nested', 'value')

      expect(obj).toStrictEqual({ footer: { nested: 'value' } })
    })
  })

  describe(deepMerge, () => {
    it('should merge flat objects', () => {
      const target = { a: 1 }
      const source = { b: 2 }

      expect(deepMerge(target, source)).toStrictEqual({ a: 1, b: 2 })
    })

    it('should deep merge nested objects', () => {
      const target = { footer: { existing: 'value' } }
      const source = { footer: { newKey: 'new value' } }

      expect(deepMerge(target, source)).toStrictEqual({
        footer: { existing: 'value', newKey: 'new value' }
      })
    })

    it('should overwrite values in nested objects', () => {
      const target = { footer: { key: 'old' } }
      const source = { footer: { key: 'new' } }

      expect(deepMerge(target, source)).toStrictEqual({
        footer: { key: 'new' }
      })
    })

    it('should handle deeply nested merges', () => {
      const target = { footer: { getHelp: { phone: '123' } } }
      const source = { footer: { getHelp: { email: 'test@example.com' } } }

      expect(deepMerge(target, source)).toStrictEqual({
        footer: { getHelp: { phone: '123', email: 'test@example.com' } }
      })
    })

    it('should not modify original objects', () => {
      const target = { a: { b: 1 } }
      const source = { a: { c: 2 } }
      const result = deepMerge(target, source)

      expect(target).toStrictEqual({ a: { b: 1 } })
      expect(result).toStrictEqual({ a: { b: 1, c: 2 } })
    })

    it('should replace arrays instead of merging them', () => {
      const target = { items: [1, 2] }
      const source = { items: [3, 4] }

      expect(deepMerge(target, source)).toStrictEqual({ items: [3, 4] })
    })
  })

  // Run integration tests sequentially to avoid race conditions with i18n scanner
  describe.sequential(importTranslations, () => {
    let testExcelPath
    const testNamespaces = []

    /**
     * Helper to cleanup test artifacts
     */
    async function cleanup() {
      if (testExcelPath && existsSync(testExcelPath)) {
        unlinkSync(testExcelPath)
        testExcelPath = null
      }

      for (const namespace of testNamespaces) {
        const namespaceDir = join(testSrcDir, namespace)
        if (existsSync(namespaceDir)) {
          await rm(namespaceDir, { recursive: true, force: true })
        }
      }
      testNamespaces.length = 0
    }

    afterEach(cleanup)

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

    it('should import translations with nested keys and deep merge', async () => {
      // This test covers: basic import, nested keys, deep merge, and merge with existing
      registerNamespace('test-integration')

      const testDir = join(testSrcDir, 'test-integration')
      await mkdir(testDir, { recursive: true })

      // Create existing cy.json with nested structure
      const cyFilePath = join(testDir, 'cy.json')
      await writeFile(
        cyFilePath,
        JSON.stringify(
          {
            existingKey: 'Existing',
            footer: {
              crownCopyright: 'Existing Crown',
              getHelp: {
                phone: '123'
              }
            }
          },
          null,
          2
        ),
        'utf-8'
      )

      // Create Excel with nested keys
      testExcelPath = await createTestExcel('test-integration.xlsx', [
        { fieldName: 'test-integration:pageTitle', en: 'Home', cy: 'Hafan' },
        {
          fieldName: 'test-integration:footer.getHelp.email',
          en: 'test@example.com',
          cy: 'prawf@enghraifft.com'
        },
        {
          fieldName: 'test-integration:footer.links.privacy',
          en: 'Privacy',
          cy: 'Preifatrwydd'
        }
      ])

      await importTranslations('test-integration.xlsx')

      const content = await readFile(cyFilePath, 'utf-8')
      const translations = JSON.parse(content)

      // Verify deep merge worked correctly
      expect(translations).toStrictEqual({
        existingKey: 'Existing',
        pageTitle: 'Hafan',
        footer: {
          crownCopyright: 'Existing Crown',
          getHelp: {
            phone: '123',
            email: 'prawf@enghraifft.com'
          },
          links: {
            privacy: 'Preifatrwydd'
          }
        }
      })
    })

    it('should skip invalid rows and handle colons in keys', async () => {
      // This test covers: skip missing data, skip invalid field names, colons in keys
      registerNamespace('test-skip-invalid')

      const testDir = join(testSrcDir, 'test-skip-invalid')
      await mkdir(testDir, { recursive: true })

      testExcelPath = await createTestExcel('test-skip-invalid.xlsx', [
        { fieldName: '', cy: 'Should be skipped - empty field name' },
        { fieldName: 'test-skip-invalid:empty', cy: '' },
        { fieldName: 'invalidnocolon', cy: 'Should be skipped - no colon' },
        { fieldName: 'test-skip-invalid:valid', en: 'Valid', cy: 'Dilys' },
        {
          fieldName: 'test-skip-invalid:error:validation:required',
          en: 'Required',
          cy: 'Gofynnol'
        }
      ])

      await importTranslations('test-skip-invalid.xlsx')

      const content = await readFile(join(testDir, 'cy.json'), 'utf-8')
      const translations = JSON.parse(content)

      expect(translations).toStrictEqual({
        valid: 'Dilys',
        'error:validation:required': 'Gofynnol'
      })
    })

    it('should handle invalid JSON and continue on namespace failure', async () => {
      // This test covers: invalid JSON recovery, continue processing on failure
      registerNamespace('test-recovery')

      const testDir = join(testSrcDir, 'test-recovery')
      await mkdir(testDir, { recursive: true })

      // Create invalid JSON file
      const cyFilePath = join(testDir, 'cy.json')
      await writeFile(cyFilePath, 'invalid json{{{', 'utf-8')

      testExcelPath = await createTestExcel('test-recovery.xlsx', [
        { fieldName: 'nonexistent-namespace:key', en: 'Key', cy: 'Allwedd' },
        { fieldName: 'test-recovery:key', en: 'Key', cy: 'Allwedd' }
      ])

      await importTranslations('test-recovery.xlsx')

      const content = await readFile(cyFilePath, 'utf-8')
      const translations = JSON.parse(content)

      expect(translations).toStrictEqual({ key: 'Allwedd' })
    })

    it('should create cy.json if it does not exist', async () => {
      registerNamespace('test-create-new')

      const testDir = join(testSrcDir, 'test-create-new')
      await mkdir(testDir, { recursive: true })

      testExcelPath = await createTestExcel('test-create-new.xlsx', [
        { fieldName: 'test-create-new:key', en: 'Key', cy: 'Allwedd' }
      ])

      await importTranslations('test-create-new.xlsx')

      const cyFilePath = join(testDir, 'cy.json')

      expect(existsSync(cyFilePath)).toBe(true)

      const content = await readFile(cyFilePath, 'utf-8')
      const translations = JSON.parse(content)

      expect(translations).toStrictEqual({ key: 'Allwedd' })
    })
  })
})
