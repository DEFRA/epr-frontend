import i18next from 'i18next'
import Backend from 'i18next-fs-backend'
import middleware from 'i18next-http-middleware'
import { initI18n } from './i18n.js'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { languages } from '#server/common/constants/language-codes.js'

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
        ns: ['common', 'home', 'errors'],
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
})
