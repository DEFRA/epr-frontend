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
import { config } from '#config/config.js'

const mockReadFileSync = vi.fn()
const mockLoggerError = vi.fn()
const mockGetUserSession = vi.fn()

vi.mock(import('node:fs'), async () => ({
  ...(await vi.importActual('node:fs')),
  readFileSync: () => mockReadFileSync()
}))
vi.mock(import('#server/common/helpers/logging/logger.js'), () => ({
  createLogger: () => ({ error: (...args) => mockLoggerError(...args) })
}))
vi.mock(import('#server/common/helpers/auth/get-user-session.js'), () => ({
  getUserSession: (...args) => mockGetUserSession(...args)
}))

const serviceName = 'Manage your packaging waste responsibilities'
const navigation = [
  {
    active: true,
    href: '/',
    text: 'Your sites'
  }
]

describe('#context', () => {
  const mockRequest = {
    path: '/'
  }
  let contextResult

  beforeEach(() => {
    mockGetUserSession.mockResolvedValue({})
  })

  describe('defra id', () => {
    let contextImport

    beforeAll(async () => {
      contextImport = await import('#config/nunjucks/context/context.js')
    })

    afterEach(() => {
      config.reset('defraId.oidcConfigurationUrl')
    })

    it('should indicate defra id is enabled when oidc configuration url is set', async () => {
      config.set(
        'defraId.oidcConfigurationUrl',
        'http://defra-id.auth/.well-known/openid-configuration'
      )

      contextResult = await contextImport.context(mockRequest)

      expect(contextResult).toStrictEqual(
        expect.objectContaining({
          isDefraIdEnabled: true,
          navigation
        })
      )
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
          authedUser: null,
          navigation: [{ ...navigation[0], active: false }]
        })
      )
    })

    it('should add the authed user to the context', async () => {
      mockGetUserSession.mockResolvedValue({ token: 'token-val' })

      contextResult = await contextImport.context(mockRequest)

      expect(contextResult).toStrictEqual(
        expect.objectContaining({ authedUser: { token: 'token-val' } })
      )
    })
  })

  describe('when webpack manifest file read succeeds', () => {
    let contextImport

    beforeAll(async () => {
      contextImport = await import('#config/nunjucks/context/context.js')
    })

    beforeEach(async () => {
      // Return JSON string
      mockReadFileSync.mockReturnValue(`{
        "application.js": "javascripts/application.js",
        "stylesheets/application.scss": "stylesheets/application.css"
      }`)

      contextResult = await contextImport.context(mockRequest)
    })

    test('should provide expected context', () => {
      expect(contextResult).toStrictEqual({
        assetPath: '/public/assets',
        authedUser: {},
        breadcrumbs: [],
        getAssetPath: expect.any(Function),
        isDefraIdEnabled: false,
        navigation,
        serviceName,
        serviceUrl: '/'
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

      contextResult = await contextImport.context(mockRequest)
    })

    test('should log that the Webpack Manifest file is not available', () => {
      expect(mockLoggerError).toHaveBeenCalledExactlyOnceWith(
        'Webpack assets-manifest.json not found'
      )
    })
  })
})

describe('#context cache', () => {
  const mockRequest = {
    path: '/'
  }
  let contextResult

  describe('webpack manifest file cache', () => {
    let contextImport

    beforeAll(async () => {
      contextImport = await import('#config/nunjucks/context/context.js')
    })

    beforeEach(async () => {
      // Return JSON string
      mockReadFileSync.mockReturnValue(`{
        "application.js": "javascripts/application.js",
        "stylesheets/application.scss": "stylesheets/application.css"
      }`)

      contextResult = await contextImport.context(mockRequest)
    })

    test('should read file', () => {
      expect(mockReadFileSync).toHaveBeenCalledExactlyOnceWith()
    })

    test('should provide expected context', () => {
      expect(contextResult).toStrictEqual({
        assetPath: '/public/assets',
        authedUser: {},
        breadcrumbs: [],
        getAssetPath: expect.any(Function),
        isDefraIdEnabled: false,
        navigation,
        serviceName,
        serviceUrl: '/'
      })
    })
  })
})
