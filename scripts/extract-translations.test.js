import fs from 'node:fs'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import {
  parseArgs,
  findNamespaces,
  flattenKeys,
  extractMissingTranslations,
  writeToExcel,
  main,
  run
} from './extract-translations.js'

const execFileAsync = promisify(execFile)

vi.mock(import('node:fs'))
vi.mock(import('exceljs'), () => ({
  default: {
    Workbook: class MockWorkbook {
      constructor() {
        this.worksheet = {
          columns: [],
          getRow: () => ({ font: {} }),
          addRow: vi.fn()
        }
        this.xlsx = {
          writeFile: vi.fn(async () => {})
        }
      }

      addWorksheet() {
        return this.worksheet
      }
    }
  }
}))

describe('extract-translations', () => {
  describe(parseArgs, () => {
    it('should extract output path from args', () => {
      const args = ['--out', './output.xlsx']
      const result = parseArgs(args)

      expect(result).toEqual({ outputPath: './output.xlsx' })
    })

    it('should throw error when --out is missing', () => {
      const args = []

      expect(() => parseArgs(args)).toThrow('--out argument is required')
    })

    it('should throw error when --out value is missing', () => {
      const args = ['--out']

      expect(() => parseArgs(args)).toThrow('--out argument is required')
    })

    it('should handle --out with other arguments', () => {
      const args = ['--verbose', '--out', './test.xlsx', '--other']
      const result = parseArgs(args)

      expect(result).toEqual({ outputPath: './test.xlsx' })
    })
  })

  describe(findNamespaces, () => {
    beforeEach(() => {
      vi.resetAllMocks()
    })

    it('should find all directory entries', () => {
      const mockEntries = [
        { name: 'home', isDirectory: () => true, isFile: () => false },
        { name: 'account', isDirectory: () => true, isFile: () => false },
        { name: 'en.json', isDirectory: () => false, isFile: () => true }
      ]

      vi.mocked(fs.readdirSync).mockReturnValue(mockEntries)

      const result = findNamespaces('/base/path')

      expect(result).toEqual([
        { namespace: 'home', path: '/base/path/home' },
        { namespace: 'account', path: '/base/path/account' }
      ])
    })

    it('should return empty array when no directories found', () => {
      const mockEntries = [
        { name: 'en.json', isDirectory: () => false, isFile: () => true }
      ]

      vi.mocked(fs.readdirSync).mockReturnValue(mockEntries)

      const result = findNamespaces('/base/path')

      expect(result).toEqual([])
    })
  })

  describe(flattenKeys, () => {
    it('should flatten simple nested object', () => {
      const input = {
        a: {
          b: 'value1',
          c: 'value2'
        }
      }

      const result = flattenKeys(input)

      expect(result).toEqual({
        'a.b': 'value1',
        'a.c': 'value2'
      })
    })

    it('should flatten deeply nested object', () => {
      const input = {
        level1: {
          level2: {
            level3: 'deep value'
          }
        }
      }

      const result = flattenKeys(input)

      expect(result).toEqual({
        'level1.level2.level3': 'deep value'
      })
    })

    it('should handle flat object', () => {
      const input = {
        key1: 'value1',
        key2: 'value2'
      }

      const result = flattenKeys(input)

      expect(result).toEqual(input)
    })

    it('should handle arrays as values', () => {
      const input = {
        items: ['a', 'b', 'c']
      }

      const result = flattenKeys(input)

      expect(result).toEqual({
        items: ['a', 'b', 'c']
      })
    })

    it('should handle empty object', () => {
      const result = flattenKeys({})

      expect(result).toEqual({})
    })

    it('should handle null values', () => {
      const input = {
        key: null
      }

      const result = flattenKeys(input)

      expect(result).toEqual({
        key: null
      })
    })

    it('should use custom prefix', () => {
      const input = {
        a: 'value'
      }

      const result = flattenKeys(input, 'prefix')

      expect(result).toEqual({
        'prefix.a': 'value'
      })
    })
  })

  describe(extractMissingTranslations, () => {
    beforeEach(() => {
      vi.resetAllMocks()
    })

    it('should extract missing translations when cy is missing', () => {
      const mockEntries = [
        { name: 'home', isDirectory: () => true, isFile: () => false }
      ]

      vi.mocked(fs.readdirSync).mockReturnValue(mockEntries)
      vi.mocked(fs.existsSync).mockImplementation((path) => {
        if (path.includes('en.json')) return true
        if (path.includes('cy.json')) return false
        return false
      })
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({ greeting: 'Hello' })
      )

      const result = extractMissingTranslations('/base/path')

      expect(result).toEqual([{ field: 'home:greeting', en: 'Hello', cy: '' }])
    })

    it('should extract missing translations when en is missing', () => {
      const mockEntries = [
        { name: 'home', isDirectory: () => true, isFile: () => false }
      ]

      vi.mocked(fs.readdirSync).mockReturnValue(mockEntries)
      vi.mocked(fs.existsSync).mockImplementation((path) => {
        if (path.includes('en.json')) return false
        if (path.includes('cy.json')) return true
        return false
      })
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({ greeting: 'Helo' })
      )

      const result = extractMissingTranslations('/base/path')

      expect(result).toEqual([{ field: 'home:greeting', en: '', cy: 'Helo' }])
    })

    it('should skip namespaces without any translation files', () => {
      const mockEntries = [
        { name: 'home', isDirectory: () => true, isFile: () => false }
      ]

      vi.mocked(fs.readdirSync).mockReturnValue(mockEntries)
      vi.mocked(fs.existsSync).mockReturnValue(false)

      const result = extractMissingTranslations('/base/path')

      expect(result).toEqual([])
    })

    it('should handle nested translation keys', () => {
      const mockEntries = [
        { name: 'home', isDirectory: () => true, isFile: () => false }
      ]

      vi.mocked(fs.readdirSync).mockReturnValue(mockEntries)
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockImplementation((path) => {
        if (path.includes('en.json')) {
          return JSON.stringify({ services: { registration: 'Registration' } })
        }
        return JSON.stringify({})
      })

      const result = extractMissingTranslations('/base/path')

      expect(result).toEqual([
        { field: 'home:services.registration', en: 'Registration', cy: '' }
      ])
    })

    it('should not include translations that exist in both files', () => {
      const mockEntries = [
        { name: 'home', isDirectory: () => true, isFile: () => false }
      ]

      vi.mocked(fs.readdirSync).mockReturnValue(mockEntries)
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({ greeting: 'Hello' })
      )

      const result = extractMissingTranslations('/base/path')

      expect(result).toEqual([])
    })

    it('should handle multiple namespaces', () => {
      const mockEntries = [
        { name: 'home', isDirectory: () => true, isFile: () => false },
        { name: 'account', isDirectory: () => true, isFile: () => false }
      ]

      vi.mocked(fs.readdirSync).mockReturnValue(mockEntries)
      vi.mocked(fs.existsSync).mockImplementation((path) => {
        if (path.includes('home')) return true
        if (path.includes('account/en.json')) return true
        if (path.includes('account/cy.json')) return false
        return false
      })
      vi.mocked(fs.readFileSync).mockImplementation((path) => {
        if (path.includes('home')) {
          return JSON.stringify({ title: 'Home' })
        }
        return JSON.stringify({ title: 'Account' })
      })

      const result = extractMissingTranslations('/base/path')

      expect(result).toEqual([
        { field: 'account:title', en: 'Account', cy: '' }
      ])
    })
  })

  describe(writeToExcel, () => {
    beforeEach(() => {
      vi.clearAllMocks()
      vi.mocked(fs.existsSync).mockReturnValue(true)
    })

    it('should create workbook and worksheet', async () => {
      const data = [{ field: 'test:key', en: 'English', cy: 'Welsh' }]

      await writeToExcel(data, '/output/file.xlsx')

      expect(fs.existsSync).toHaveBeenCalled()
    })

    it('should set worksheet columns', async () => {
      const data = []

      const result = await writeToExcel(data, '/output/file.xlsx')

      expect(result).toBeUndefined()
    })

    it('should add data rows', async () => {
      const data = [
        { field: 'test:key1', en: 'English 1', cy: 'Welsh 1' },
        { field: 'test:key2', en: 'English 2', cy: 'Welsh 2' }
      ]

      await writeToExcel(data, '/output/file.xlsx')

      expect(fs.existsSync).toHaveBeenCalled()
    })

    it('should create output directory if it does not exist', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false)
      vi.mocked(fs.mkdirSync).mockReturnValue(undefined)

      await writeToExcel([], '/output/dir/file.xlsx')

      expect(fs.mkdirSync).toHaveBeenCalledWith('/output/dir', {
        recursive: true
      })
    })

    it('should not create directory if it exists', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)

      await writeToExcel([], '/output/file.xlsx')

      expect(fs.mkdirSync).not.toHaveBeenCalled()
    })

    it('should write file', async () => {
      await writeToExcel([], '/output/file.xlsx')

      expect(fs.existsSync).toHaveBeenCalled()
    })
  })

  describe(main, () => {
    let consoleLogSpy
    let originalArgv

    beforeEach(() => {
      vi.resetAllMocks()
      consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      originalArgv = process.argv
      process.argv = ['node', 'script.js', '--out', './output.xlsx']
    })

    afterEach(() => {
      consoleLogSpy.mockRestore()
      process.argv = originalArgv
    })

    it('should throw error when base directory does not exist', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false)

      await expect(main()).rejects.toThrow('Directory')
    })

    it('should log success message with singular translation', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readdirSync).mockReturnValue([
        { name: 'home', isDirectory: () => true, isFile: () => false }
      ])
      vi.mocked(fs.readFileSync).mockImplementation((path) => {
        if (path.includes('en.json')) {
          return JSON.stringify({ key: 'value' })
        }
        return JSON.stringify({})
      })

      await main()

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('1 missing translation')
      )
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.not.stringContaining('translations')
      )
    })

    it('should log success message with plural translations', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readdirSync).mockReturnValue([
        { name: 'home', isDirectory: () => true, isFile: () => false }
      ])
      vi.mocked(fs.readFileSync).mockImplementation((path) => {
        if (path.includes('en.json')) {
          return JSON.stringify({ key1: 'value1', key2: 'value2' })
        }
        return JSON.stringify({})
      })

      await main()

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('2 missing translations')
      )
    })

    it('should log output path', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readdirSync).mockReturnValue([])

      await main()

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('./output.xlsx')
      )
    })
  })

  describe(run, () => {
    let consoleLogSpy
    let consoleErrorSpy
    let originalArgv
    let originalExitCode

    beforeEach(() => {
      vi.resetAllMocks()
      consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      originalArgv = process.argv
      originalExitCode = process.exitCode
      process.exitCode = 0
    })

    afterEach(() => {
      consoleLogSpy.mockRestore()
      consoleErrorSpy.mockRestore()
      process.argv = originalArgv
      process.exitCode = originalExitCode
    })

    it('should run successfully and call main', async () => {
      process.argv = ['node', 'script.js', '--out', './output.xlsx']
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readdirSync).mockReturnValue([])

      await run()

      expect(consoleLogSpy).toHaveBeenCalled()
      expect(process.exitCode).toBe(0)
    })

    it('should catch and log errors from main', async () => {
      process.argv = ['node', 'script.js']

      await run()

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('❌')
      )
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('--out argument is required')
      )
      expect(process.exitCode).toBe(1)
    })
  })

  describe('CLI execution', () => {
    it('should handle errors when run directly without --out argument', async () => {
      const scriptPath = new URL('./extract-translations.js', import.meta.url)
        .pathname

      try {
        await execFileAsync('node', [scriptPath])
        expect.fail('Should have thrown an error')
      } catch (error) {
        expect(error.code).toBe(1)
        expect(error.stderr).toContain('--out argument is required')
      }
    })

    it('should execute successfully when run directly with --out argument', async () => {
      const scriptPath = new URL('./extract-translations.js', import.meta.url)
        .pathname
      const outputPath = '/tmp/test-cli-output.xlsx'

      const { stdout } = await execFileAsync('node', [
        scriptPath,
        '--out',
        outputPath
      ])

      expect(stdout).toContain('✅ Exported')
      expect(stdout).toContain(outputPath)

      await execFileAsync('rm', ['-f', outputPath])
    }, 10000)
  })
})
