import { describe, it, expect, afterEach } from 'vitest'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { existsSync, unlinkSync } from 'node:fs'
import exportPlugin, {
  transformToExcelFormat
} from './i18next-export-plugin.mjs'

const currentDir = dirname(fileURLToPath(import.meta.url))

describe('i18next-export-plugin', () => {
  describe('transformToExcelFormat', () => {
    it('should return empty array for empty results', () => {
      const results = []
      const output = transformToExcelFormat(results)

      expect(output).toEqual([])
    })

    it('should transform flat English translations with missing Welsh', () => {
      const results = [
        {
          path: '/path/to/src/server/home/en.json',
          newTranslations: {
            pageTitle: 'Home',
            heading: 'Welcome'
          }
        },
        {
          path: '/path/to/src/server/home/cy.json',
          newTranslations: {
            pageTitle: '',
            heading: ''
          }
        }
      ]

      const output = transformToExcelFormat(results)

      expect(output).toHaveLength(2)
      expect(output[0]).toEqual({
        'field name': 'home:heading',
        en: 'Welcome',
        cy: ''
      })
      expect(output[1]).toEqual({
        'field name': 'home:pageTitle',
        en: 'Home',
        cy: ''
      })
    })

    it('should handle nested translations', () => {
      const results = [
        {
          path: '/path/to/src/server/common/en.json',
          newTranslations: {
            navigation: {
              signOut: 'Sign out',
              home: 'Home'
            }
          }
        },
        {
          path: '/path/to/src/server/common/cy.json',
          newTranslations: {
            navigation: {
              signOut: '',
              home: ''
            }
          }
        }
      ]

      const output = transformToExcelFormat(results)

      expect(output).toHaveLength(2)
      expect(output[0]).toEqual({
        'field name': 'common:navigation.home',
        en: 'Home',
        cy: ''
      })
      expect(output[1]).toEqual({
        'field name': 'common:navigation.signOut',
        en: 'Sign out',
        cy: ''
      })
    })

    it('should handle deeply nested translations', () => {
      const results = [
        {
          path: '/path/to/src/server/account/en.json',
          newTranslations: {
            settings: {
              profile: {
                name: 'Name',
                email: 'Email'
              }
            }
          }
        },
        {
          path: '/path/to/src/server/account/cy.json',
          newTranslations: {
            settings: {
              profile: {
                name: '',
                email: ''
              }
            }
          }
        }
      ]

      const output = transformToExcelFormat(results)

      expect(output).toHaveLength(2)
      expect(output[0]).toMatchObject({
        'field name': 'account:settings.profile.email',
        en: 'Email',
        cy: ''
      })
      expect(output[1]).toMatchObject({
        'field name': 'account:settings.profile.name',
        en: 'Name',
        cy: ''
      })
    })

    it('should filter out already translated strings', () => {
      const results = [
        {
          path: '/path/to/src/server/home/en.json',
          newTranslations: {
            pageTitle: 'Home',
            heading: 'Welcome',
            untranslated: 'This needs translation'
          }
        },
        {
          path: '/path/to/src/server/home/cy.json',
          newTranslations: {
            pageTitle: 'Hafan',
            heading: 'Croeso',
            untranslated: ''
          }
        }
      ]

      const output = transformToExcelFormat(results)

      // Only untranslated should be included
      expect(output).toHaveLength(1)
      expect(output[0]).toEqual({
        'field name': 'home:untranslated',
        en: 'This needs translation',
        cy: ''
      })
    })

    it('should filter out entries where English is empty', () => {
      const results = [
        {
          path: '/path/to/src/server/test/en.json',
          newTranslations: {
            validKey: 'Valid',
            emptyKey: '',
            whitespaceKey: '   '
          }
        },
        {
          path: '/path/to/src/server/test/cy.json',
          newTranslations: {
            validKey: '',
            emptyKey: '',
            whitespaceKey: ''
          }
        }
      ]

      const output = transformToExcelFormat(results)

      // Only validKey should be included (has English, missing Welsh)
      expect(output).toHaveLength(1)
      expect(output[0]).toEqual({
        'field name': 'test:validKey',
        en: 'Valid',
        cy: ''
      })
    })

    it('should handle multiple namespaces', () => {
      const results = [
        {
          path: '/path/to/src/server/home/en.json',
          newTranslations: { title: 'Home' }
        },
        {
          path: '/path/to/src/server/home/cy.json',
          newTranslations: { title: '' }
        },
        {
          path: '/path/to/src/server/account/en.json',
          newTranslations: { title: 'Account' }
        },
        {
          path: '/path/to/src/server/account/cy.json',
          newTranslations: { title: '' }
        }
      ]

      const output = transformToExcelFormat(results)

      expect(output).toHaveLength(2)
      expect(output.map((item) => item['field name'])).toEqual([
        'account:title',
        'home:title'
      ])
    })

    it('should sort output alphabetically by field name', () => {
      const results = [
        {
          path: '/path/to/src/server/test/en.json',
          newTranslations: {
            zebra: 'Z',
            apple: 'A',
            middle: 'M'
          }
        },
        {
          path: '/path/to/src/server/test/cy.json',
          newTranslations: {
            zebra: '',
            apple: '',
            middle: ''
          }
        }
      ]

      const output = transformToExcelFormat(results)

      expect(output.map((item) => item['field name'])).toEqual([
        'test:apple',
        'test:middle',
        'test:zebra'
      ])
    })

    it('should handle Welsh translation with only whitespace as missing', () => {
      const results = [
        {
          path: '/path/to/src/server/test/en.json',
          newTranslations: { key1: 'English' }
        },
        {
          path: '/path/to/src/server/test/cy.json',
          newTranslations: { key1: '   ' }
        }
      ]

      const output = transformToExcelFormat(results)

      expect(output).toHaveLength(1)
      expect(output[0].cy).toBe('   ')
    })

    it('should extract namespace from paths without server directory', () => {
      const results = [
        {
          path: '/some/other/path/en.json',
          newTranslations: { key: 'value' }
        },
        {
          path: '/some/other/path/cy.json',
          newTranslations: { key: '' }
        }
      ]

      const output = transformToExcelFormat(results)

      expect(output).toHaveLength(1)
      expect(output[0]['field name']).toBe('en:key')
    })

    it('should handle null and undefined values', () => {
      const results = [
        {
          path: '/path/to/src/server/test/en.json',
          newTranslations: {
            nullValue: null,
            undefinedValue: undefined,
            validValue: 'Valid'
          }
        },
        {
          path: '/path/to/src/server/test/cy.json',
          newTranslations: {
            nullValue: '',
            undefinedValue: '',
            validValue: ''
          }
        }
      ]

      const output = transformToExcelFormat(results)

      // Only validValue should be included
      expect(output).toHaveLength(1)
      expect(output[0]).toEqual({
        'field name': 'test:validValue',
        en: 'Valid',
        cy: ''
      })
    })

    it('should handle mixed nested and flat keys', () => {
      const results = [
        {
          path: '/path/to/src/server/mixed/en.json',
          newTranslations: {
            flatKey: 'Flat',
            nested: {
              deep: {
                key: 'Deep'
              }
            },
            anotherFlat: 'Another'
          }
        },
        {
          path: '/path/to/src/server/mixed/cy.json',
          newTranslations: {
            flatKey: '',
            nested: {
              deep: {
                key: ''
              }
            },
            anotherFlat: ''
          }
        }
      ]

      const output = transformToExcelFormat(results)

      expect(output).toHaveLength(3)
      expect(output.map((item) => item['field name'])).toEqual([
        'mixed:anotherFlat',
        'mixed:flatKey',
        'mixed:nested.deep.key'
      ])
    })
  })

  describe('exportPlugin', () => {
    let testOutputPath

    afterEach(() => {
      if (testOutputPath && existsSync(testOutputPath)) {
        unlinkSync(testOutputPath)
      }
    })

    it('should create plugin with default options', () => {
      const plugin = exportPlugin()

      expect(plugin).toBeDefined()
      expect(plugin.name).toBe('export-plugin')
      expect(plugin.version).toBe('1.0.0')
      expect(plugin.afterSync).toBeTypeOf('function')
    })

    it('should create plugin with custom output path', () => {
      const plugin = exportPlugin({ output: 'custom.json' })

      expect(plugin).toBeDefined()
      expect(plugin.name).toBe('export-plugin')
    })

    it('should export Excel file with translation data', async () => {
      const plugin = exportPlugin()
      testOutputPath = join(currentDir, '..', 'test-output.xlsx')

      const mockResults = [
        {
          path: '/path/to/src/server/home/en.json',
          newTranslations: { pageTitle: 'Home', heading: 'Welcome' }
        },
        {
          path: '/path/to/src/server/home/cy.json',
          newTranslations: { pageTitle: '', heading: '' }
        }
      ]

      await plugin.afterSync(mockResults, { out: 'test-output.xlsx' })

      expect(existsSync(testOutputPath)).toBe(true)

      const ExcelJS = await import('exceljs')
      const workbook = new ExcelJS.Workbook()
      await workbook.xlsx.readFile(testOutputPath)
      const worksheet = workbook.getWorksheet('Translations')

      expect(worksheet.rowCount).toBe(3)
    })

    it('should handle single untranslated string', async () => {
      const plugin = exportPlugin()
      testOutputPath = join(currentDir, '..', 'test-single.xlsx')

      const mockResults = [
        {
          path: '/path/to/src/server/home/en.json',
          newTranslations: { pageTitle: 'Home' }
        },
        {
          path: '/path/to/src/server/home/cy.json',
          newTranslations: { pageTitle: '' }
        }
      ]

      await plugin.afterSync(mockResults, { out: 'test-single.xlsx' })

      expect(existsSync(testOutputPath)).toBe(true)
    })

    it('should handle empty results', async () => {
      const plugin = exportPlugin()
      testOutputPath = join(currentDir, '..', 'test-empty.xlsx')

      await plugin.afterSync([], { out: 'test-empty.xlsx' })

      expect(existsSync(testOutputPath)).toBe(true)

      const ExcelJS = await import('exceljs')
      const workbook = new ExcelJS.Workbook()
      await workbook.xlsx.readFile(testOutputPath)
      const worksheet = workbook.getWorksheet('Translations')

      expect(worksheet.rowCount).toBe(1)
    })

    it('should use default filename when no output specified', async () => {
      const defaultOutputPath = join(currentDir, '..', 'translations.xlsx')
      const plugin = exportPlugin()

      try {
        await plugin.afterSync([])
        expect(existsSync(defaultOutputPath)).toBe(true)
      } finally {
        if (existsSync(defaultOutputPath)) {
          unlinkSync(defaultOutputPath)
        }
      }
    })
  })
})
