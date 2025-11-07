import { languages } from '#server/common/constants/languages.js'
import i18next from 'i18next'
import Backend from 'i18next-fs-backend'
import middleware from 'i18next-http-middleware'
import fs from 'node:fs'
import path from 'node:path'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { initI18n } from './i18n.js'

vi.mock(import('i18next'))
vi.mock(import('i18next-fs-backend'))
vi.mock(import('i18next-http-middleware'))
vi.mock(import('node:fs'))

describe(initI18n, function () {
  beforeEach(() => {
    vi.spyOn(i18next, 'use').mockReturnThis()
    vi.spyOn(i18next, 'init').mockResolvedValue()

    // Mock fs.readdirSync to return directory structures
    vi.mocked(fs.readdirSync).mockImplementation((dirPath) => {
      const pathStr = dirPath.toString()

      // Base directory scans - return directories with isDirectory method
      if (pathStr.endsWith('src/routes')) {
        return [{ name: 'home', isDirectory: () => true }]
      }

      if (pathStr.endsWith('src/server')) {
        return [
          { name: 'account', isDirectory: () => true },
          { name: 'common', isDirectory: () => true },
          { name: 'error', isDirectory: () => true },
          { name: 'registration', isDirectory: () => true },
          { name: 'summary-log-upload', isDirectory: () => true },
          { name: 'summary-log-upload-progress', isDirectory: () => true }
        ]
      }

      // Subdirectory scans - return files
      return ['en.json', 'cy.json']
    })
  })

  test('initialises i18next with expected configuration', async () => {
    await initI18n()

    expect(i18next.use).toHaveBeenCalledWith(Backend)
    expect(i18next.use).toHaveBeenCalledWith(middleware.LanguageDetector)
    expect(i18next.init).toHaveBeenCalledWith(
      expect.objectContaining({
        fallbackLng: languages.ENGLISH,
        preload: [languages.ENGLISH, languages.WELSH],
        ns: expect.arrayContaining([
          'account',
          'common',
          'error',
          'home',
          'summary-log-upload',
          'summary-log-upload-progress'
        ]),
        defaultNS: 'common',
        debug: false
      })
    )
  })

  test('loadPath function uses pre-built namespace map', async () => {
    await initI18n()

    const config = i18next.init.mock.calls[0][0]
    const loadPath = config.backend.loadPath

    expect(loadPath).toBeTypeOf('function')

    // Test 1: Namespace found in src/routes (home) - should return routes path
    const routesPath = loadPath('en', 'home')

    expect(routesPath).toBe(path.resolve('src/routes/home/en.json'))

    // Test 2: Namespace found in src/server (account) - should return server path
    const serverPath = loadPath('en', 'account')

    expect(serverPath).toBe(path.resolve('src/server/account/en.json'))

    // Test 3: Unknown namespace - should throw error with available namespaces
    expect(() => loadPath('en', 'nonexistent')).toThrow(
      'Translation namespace "nonexistent" not found. Available namespaces: home, account, common, error, registration, summary-log-upload, summary-log-upload-progress'
    )
  })

  test('prioritizes routes over server when namespace exists in both', async () => {
    // Override mock to include 'common' in both directories
    vi.mocked(fs.readdirSync).mockImplementation((dirPath) => {
      const pathStr = dirPath.toString()

      if (pathStr.endsWith('src/routes')) {
        return [
          { name: 'home', isDirectory: () => true },
          { name: 'common', isDirectory: () => true } // Now in both!
        ]
      }

      if (pathStr.endsWith('src/server')) {
        return [
          { name: 'account', isDirectory: () => true },
          { name: 'common', isDirectory: () => true } // Duplicate
        ]
      }

      return ['en.json', 'cy.json']
    })

    await initI18n()

    const config = i18next.init.mock.calls[0][0]
    const loadPath = config.backend.loadPath

    // 'common' should use routes path (first occurrence wins)
    const commonPath = loadPath('en', 'common')

    expect(commonPath).toBe(path.resolve('src/routes/common/en.json'))
  })

  test('throws if init rejects', async () => {
    i18next.init.mockRejectedValueOnce(new Error('init failed'))

    await expect(initI18n()).rejects.toThrow('init failed')
  })
})
