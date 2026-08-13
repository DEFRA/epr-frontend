import { config } from '#config/config.js'
import { SCOPES } from '#server/auth/scopes.js'
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  test,
  vi
} from 'vitest'
import { createMockLogger } from '#server/common/test-helpers/logger-helper.js'

const mockReadFileSync = vi.fn()
const mockLogger = createMockLogger()

vi.mock(import('node:fs'), async () => ({
  ...(await vi.importActual('node:fs')),
  readFileSync: () => mockReadFileSync()
}))

vi.mock(import('#server/common/helpers/logging/logger.js'), () => ({
  createLogger: () => mockLogger
}))

/**
 * @param {Partial<Request>} [options]
 */
function mockRequest(options) {
  return {
    auth: { isAuthenticated: false, credentials: null },
    localiseUrl: vi.fn((path) => path),
    path: '/',
    t: vi.fn((key) => {
      const translations = {
        'common:navigation:yourSites': 'Your sites',
        'common:navigation:signOut': 'Sign out'
      }
      return translations[key] || key
    }),
    ...options
  }
}

describe('#context', () => {
  let contextResult

  describe('defra id', () => {
    let contextImport

    beforeAll(async () => {
      contextImport = await import('#config/nunjucks/context/context.js')
    })

    afterEach(() => {
      config.reset('defraId.oidcConfigurationUrl')
    })

    it.each([
      ['undefined', undefined],
      ['null', null],
      ['0', 0],
      ['false', false],
      ['empty string', ''],
      ['NaN', NaN]
    ])('should handle a request value of %s', async (_, request) => {
      contextResult = await contextImport.context(request)

      expect(contextResult).toStrictEqual(
        expect.objectContaining({
          navigation: []
        })
      )
    })

    it('should include i18n properties when i18n is available on request', async () => {
      const mockI18nRequest = mockRequest(
        /** @type {Partial<Request>} */ ({
          i18n: {
            language: 'cy'
          }
        })
      )

      contextResult = await contextImport.context(mockI18nRequest)

      expect(contextResult).toStrictEqual(
        expect.objectContaining({
          htmlLang: 'cy',
          language: 'cy',
          localise: expect.any(Function),
          localiseUrl: expect.any(Function)
        })
      )
    })

    it('should provide fallback localise and localiseUrl when i18n is not available', async () => {
      const mockNoI18nRequest = mockRequest()

      contextResult = await contextImport.context(mockNoI18nRequest)

      expect(contextResult).not.toHaveProperty('htmlLang')
      expect(contextResult).not.toHaveProperty('language')
      expect(contextResult.localise('some:key')).toBe('some:key')
      expect(contextResult.localiseUrl('/some-path')).toBe('/some-path')
    })
  })

  describe('read-only sessions', () => {
    let contextImport

    beforeAll(async () => {
      contextImport = await import('#config/nunjucks/context/context.js')
    })

    it('marks a regulator session read-only', async () => {
      contextResult = await contextImport.context(
        mockRequest(
          /** @type {Partial<Request>} */ ({
            auth: {
              isAuthenticated: true,
              credentials: { scope: [SCOPES.regulator] }
            }
          })
        )
      )

      expect(contextResult.isReadOnly).toBe(true)
    })

    it('does not mark an operator holding the write scope read-only', async () => {
      contextResult = await contextImport.context(
        mockRequest(
          /** @type {Partial<Request>} */ ({
            auth: {
              isAuthenticated: true,
              credentials: {
                scope: [
                  'organisation.linked.read',
                  SCOPES.organisationLinkedWrite
                ]
              }
            }
          })
        )
      )

      expect(contextResult.isReadOnly).toBe(false)
    })

    it('marks a session holding other scopes read-only', async () => {
      contextResult = await contextImport.context(
        mockRequest(
          /** @type {Partial<Request>} */ ({
            auth: {
              isAuthenticated: true,
              credentials: { scope: ['something-else'] }
            }
          })
        )
      )

      expect(contextResult.isReadOnly).toBe(true)
    })

    it('marks a session without scopes read-only', async () => {
      contextResult = await contextImport.context(
        mockRequest(
          /** @type {Partial<Request>} */ ({
            auth: { isAuthenticated: true, credentials: {} }
          })
        )
      )

      expect(contextResult.isReadOnly).toBe(true)
    })

    it('marks a signed out request read-only', async () => {
      contextResult = await contextImport.context(mockRequest())

      expect(contextResult.isReadOnly).toBe(true)
    })
  })

  describe('when webpack manifest file read succeeds', () => {
    let contextImport

    beforeAll(async () => {
      contextImport = await import('#config/nunjucks/context/context.js')
    })

    beforeEach(async () => {
      config.set(
        'defraId.oidcConfigurationUrl',
        'http://defra-id.auth/.well-known/openid-configuration'
      )

      // Return JSON string
      mockReadFileSync.mockReturnValue(`{
        "application.js": "javascripts/application.js",
        "stylesheets/application.scss": "stylesheets/application.css"
      }`)

      contextResult = await contextImport.context(mockRequest())
    })

    test('should provide expected context', () => {
      expect(contextResult).toStrictEqual({
        assetPath: '/public/assets',
        breadcrumbs: [],
        getAssetPath: expect.any(Function),
        isReadOnly: true,
        localise: expect.any(Function),
        localiseUrl: expect.any(Function),
        navigation: [],
        serviceUrl: '/start'
      })
    })

    describe('with valid asset path', () => {
      test('should provide expected asset path', () => {
        expect(contextResult.getAssetPath('application.js')).toBe(
          '/public/javascripts/application.js'
        )
      })
    })

    describe('with invalid asset path', () => {
      test('should provide expected asset', () => {
        expect(contextResult.getAssetPath('an-image.png')).toBe(
          '/public/an-image.png'
        )
      })
    })
  })

  describe('when webpack manifest file read fails', () => {
    let contextImport

    beforeAll(async () => {
      vi.resetModules()
      contextImport = await import('#config/nunjucks/context/context.js')
    })

    beforeEach(async () => {
      mockReadFileSync.mockImplementation(() => {
        throw new Error('File not found')
      })

      contextResult = await contextImport.context(mockRequest())
    })

    test('should log that the Webpack Manifest file is not available', () => {
      expect(mockLogger.error).toHaveBeenCalledExactlyOnceWith({
        message: 'Webpack assets-manifest.json not found',
        err: expect.any(Error)
      })
    })
  })
})

describe('#context cache', () => {
  let contextResult

  describe('webpack manifest file cache', () => {
    let contextImport

    beforeAll(async () => {
      contextImport = await import('#config/nunjucks/context/context.js')
    })

    beforeEach(async () => {
      config.set(
        'defraId.oidcConfigurationUrl',
        'http://defra-id.auth/.well-known/openid-configuration'
      )

      // Return JSON string
      mockReadFileSync.mockReturnValue(`{
        "application.js": "javascripts/application.js",
        "stylesheets/application.scss": "stylesheets/application.css"
      }`)

      contextResult = await contextImport.context(mockRequest())
    })

    test('should read file', () => {
      expect(mockReadFileSync).toHaveBeenCalledExactlyOnceWith()
    })

    test('should provide expected context', () => {
      expect(contextResult).toStrictEqual({
        assetPath: '/public/assets',
        breadcrumbs: [],
        getAssetPath: expect.any(Function),
        isReadOnly: true,
        localise: expect.any(Function),
        localiseUrl: expect.any(Function),
        navigation: [],
        serviceUrl: '/start'
      })
    })
  })
})
