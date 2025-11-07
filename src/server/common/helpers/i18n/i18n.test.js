import { languages } from '#modules/platform/constants/languages.js'
import i18next from 'i18next'
import Backend from 'i18next-fs-backend'
import middleware from 'i18next-http-middleware'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { initI18n } from './i18n.js'
import fs from 'fs'

vi.mock(import('i18next'))
vi.mock(import('i18next-fs-backend'))
vi.mock(import('i18next-http-middleware'))

describe(initI18n, function () {
  beforeEach(() => {
    vi.spyOn(i18next, 'use').mockReturnThis()
    vi.spyOn(i18next, 'init').mockResolvedValue()
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

  test('sets correct loadPath for backend', async () => {
    await initI18n()

    const config = i18next.init.mock.calls[0][0]

    expect(config.backend.loadPath).toContain('src/server/{{ns}}/{{lng}}.json')
  })

  test('throws if init rejects', async () => {
    i18next.init.mockRejectedValueOnce(new Error('init failed'))

    await expect(initI18n()).rejects.toThrow('init failed')
  })

  test('skips directories without translation files', async () => {
    // Mock filesystem to include a directory without translation files
    const originalReaddirSync = fs.readdirSync
    vi.spyOn(fs, 'readdirSync').mockImplementation((dirPath, options) => {
      // Call the original for the base directory
      if (dirPath.endsWith('src/server')) {
        return originalReaddirSync(dirPath, options)
      }
      // For subdirectories, check if it's a directory we want to exclude
      if (dirPath.includes('/common')) {
        // Return files that don't match the translation pattern
        return ['helpers', 'middleware', 'README.md']
      }
      // For other directories, call the original
      return originalReaddirSync(dirPath, options)
    })

    await initI18n()

    // The function should still work and skip the directory without translations
    expect(i18next.init).toHaveBeenCalled()
    const config = i18next.init.mock.calls[0][0]
    // Common should not be in namespaces since we mocked it to not have translations
    expect(config.ns).not.toContain('common')

    fs.readdirSync.mockRestore()
  })
})
