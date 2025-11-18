import fs from 'node:fs'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { main, run } from './extract-translations.js'

const execFileAsync = promisify(execFile)

vi.mock(import('node:fs'))
vi.mock(import('exceljs/dist/es5/exceljs.browser.js'), () => ({
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

describe('extract-translations integration tests', () => {
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

  describe('successful extraction scenarios', () => {
    it('should extract missing Welsh translations and export to Excel', async () => {
      process.argv = ['node', 'script.js', '--out', './output.xlsx']

      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readdirSync).mockReturnValue([
        { name: 'home', isDirectory: () => true, isFile: () => false },
        { name: 'account', isDirectory: () => true, isFile: () => false }
      ])

      vi.mocked(fs.readFileSync).mockImplementation((path) => {
        if (path.includes('home/en.json')) {
          return JSON.stringify({ greeting: 'Hello', title: 'Home' })
        }
        if (path.includes('home/cy.json')) {
          return JSON.stringify({ greeting: 'Helo' })
        }
        if (path.includes('account/en.json')) {
          return JSON.stringify({ services: { registration: 'Registration' } })
        }
        if (path.includes('account/cy.json')) {
          return JSON.stringify({})
        }
        return '{}'
      })

      await main()

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('2 missing translations')
      )
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('./output.xlsx')
      )
      expect(process.exitCode).toBe(0)
    })

    it('should extract missing English translations and export to Excel', async () => {
      process.argv = ['node', 'script.js', '--out', './output.xlsx']

      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readdirSync).mockReturnValue([
        { name: 'home', isDirectory: () => true, isFile: () => false }
      ])

      vi.mocked(fs.readFileSync).mockImplementation((path) => {
        if (path.includes('home/en.json')) {
          return JSON.stringify({})
        }
        if (path.includes('home/cy.json')) {
          return JSON.stringify({ greeting: 'Helo' })
        }
        return '{}'
      })

      await main()

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('1 missing translation')
      )
      expect(process.exitCode).toBe(0)
    })

    it('should handle nested translation keys correctly', async () => {
      process.argv = ['node', 'script.js', '--out', './output.xlsx']

      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readdirSync).mockReturnValue([
        { name: 'common', isDirectory: () => true, isFile: () => false }
      ])

      vi.mocked(fs.readFileSync).mockImplementation((path) => {
        if (path.includes('common/en.json')) {
          return JSON.stringify({
            services: {
              registration: 'Registration',
              accreditation: 'Accreditation'
            }
          })
        }
        if (path.includes('common/cy.json')) {
          return JSON.stringify({ services: { registration: 'Cofrestru' } })
        }
        return '{}'
      })

      await main()

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('1 missing translation')
      )
    })

    it('should handle namespaces with and without translation files', async () => {
      process.argv = ['node', 'script.js', '--out', './output.xlsx']

      vi.mocked(fs.existsSync).mockImplementation((path) => {
        if (path.includes('src/server')) return true
        if (path.includes('output.xlsx')) return false
        if (path.includes('empty')) return false
        return true
      })
      vi.mocked(fs.readdirSync).mockReturnValue([
        { name: 'home', isDirectory: () => true, isFile: () => false },
        { name: 'empty', isDirectory: () => true, isFile: () => false }
      ])
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({}))
      vi.mocked(fs.mkdirSync).mockReturnValue(undefined)

      await main()

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('0 missing translations')
      )
    })

    it('should not export translations that exist in both files', async () => {
      process.argv = ['node', 'script.js', '--out', './output.xlsx']

      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readdirSync).mockReturnValue([
        { name: 'home', isDirectory: () => true, isFile: () => false }
      ])

      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({ greeting: 'Hello', title: 'Home' })
      )

      await main()

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('0 missing translations')
      )
    })

    it('should create output directory if it does not exist', async () => {
      process.argv = ['node', 'script.js', '--out', './new-dir/output.xlsx']

      vi.mocked(fs.existsSync).mockImplementation((path) => {
        if (path.includes('src/server')) return true
        if (path.includes('new-dir')) return false
        return false
      })
      vi.mocked(fs.readdirSync).mockReturnValue([])
      vi.mocked(fs.mkdirSync).mockReturnValue(undefined)

      await main()

      expect(fs.mkdirSync).toHaveBeenCalledWith('./new-dir', {
        recursive: true
      })
    })
  })

  describe('error handling scenarios', () => {
    it('should throw error when --out argument is missing', async () => {
      process.argv = ['node', 'script.js']

      await run()

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('--out argument is required')
      )
      expect(process.exitCode).toBe(1)
    })

    it('should throw error when base directory does not exist', async () => {
      process.argv = ['node', 'script.js', '--out', './output.xlsx']
      vi.mocked(fs.existsSync).mockReturnValue(false)

      await run()

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Directory')
      )
      expect(process.exitCode).toBe(1)
    })
  })

  describe('cLI execution', () => {
    const testOutputPath = '/tmp/test-cli-output.xlsx'

    afterEach(async () => {
      try {
        await execFileAsync('rm', ['-f', testOutputPath])
      } catch {
        // Ignore errors if file doesn't exist
      }
    })

    it('should fail when run directly without --out argument', async () => {
      const scriptPath = new URL('./extract-translations.js', import.meta.url)
        .pathname

      try {
        await execFileAsync('node', [scriptPath])

        expect.fail('Should have thrown an error')
      } catch (error) {
        // eslint-disable-next-line vitest/no-conditional-expect
        expect(error.code).toBe(1)
        // eslint-disable-next-line vitest/no-conditional-expect
        expect(error.stderr).toContain('--out argument is required')
      }
    })

    it('should execute successfully when run with valid arguments', async () => {
      const scriptPath = new URL('./extract-translations.js', import.meta.url)
        .pathname

      const { stdout } = await execFileAsync('node', [
        scriptPath,
        '--out',
        testOutputPath
      ])

      expect(stdout).toContain('✅ Exported')
      expect(stdout).toContain(testOutputPath)
    }, 10000)
  })
})
