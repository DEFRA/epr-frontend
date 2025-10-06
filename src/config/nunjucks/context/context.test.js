import { beforeAll, beforeEach, describe, expect, test, vi } from 'vitest'

const mockReadFileSync = vi.fn()
const mockLoggerError = vi.fn()

vi.mock(import('node:fs'), async () => ({
  ...(await vi.importActual('node:fs')),
  readFileSync: () => mockReadFileSync()
}))
vi.mock(import('~/src/server/common/helpers/logging/logger.js'), () => ({
  createLogger: () => ({ error: (...args) => mockLoggerError(...args) })
}))

const serviceName = 'Manage your packaging waste responsibilities'

describe('#context', () => {
  const mockRequest = { path: '/' }
  let contextResult

  describe('when webpack manifest file read succeeds', () => {
    let contextImport

    beforeAll(async () => {
      contextImport = await import('~/src/config/nunjucks/context/context.js')
    })

    beforeEach(() => {
      // Return JSON string
      mockReadFileSync.mockReturnValue(`{
        "application.js": "javascripts/application.js",
        "stylesheets/application.scss": "stylesheets/application.css"
      }`)

      contextResult = contextImport.context(mockRequest)
    })

    test('should provide expected context', () => {
      expect(contextResult).toStrictEqual({
        assetPath: '/public/assets',
        breadcrumbs: [],
        getAssetPath: expect.any(Function),
        navigation: [
          {
            active: true,
            href: '/',
            text: 'Your sites'
          }
        ],
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
      contextImport = await import('~/src/config/nunjucks/context/context.js')
    })

    beforeEach(() => {
      mockReadFileSync.mockImplementation(() => {
        throw new Error('File not found')
      })

      contextResult = contextImport.context(mockRequest)
    })

    test('should log that the Webpack Manifest file is not available', () => {
      expect(mockLoggerError).toHaveBeenCalledExactlyOnceWith(
        'Webpack assets-manifest.json not found'
      )
    })
  })
})

describe('#context cache', () => {
  const mockRequest = { path: '/' }
  let contextResult

  describe('webpack manifest file cache', () => {
    let contextImport

    beforeAll(async () => {
      contextImport = await import('~/src/config/nunjucks/context/context.js')
    })

    beforeEach(() => {
      // Return JSON string
      mockReadFileSync.mockReturnValue(`{
        "application.js": "javascripts/application.js",
        "stylesheets/application.scss": "stylesheets/application.css"
      }`)

      contextResult = contextImport.context(mockRequest)
    })

    test('should read file', () => {
      expect(mockReadFileSync).toHaveBeenCalledExactlyOnceWith()
    })

    test('should provide expected context', () => {
      expect(contextResult).toStrictEqual({
        assetPath: '/public/assets',
        breadcrumbs: [],
        getAssetPath: expect.any(Function),
        navigation: [
          {
            active: true,
            href: '/',
            text: 'Your sites'
          }
        ],
        serviceName,
        serviceUrl: '/'
      })
    })
  })
})
