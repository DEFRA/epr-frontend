const mockReadFileSync = vi.fn()
const mockLoggerError = vi.fn()

vi.mock('node:fs', async () => ({
  ...(await vi.importActual('node:fs')),
  readFileSync: () => mockReadFileSync()
}))
vi.mock('~/src/server/common/helpers/logging/logger.js', () => ({
  createLogger: () => ({ error: (...args) => mockLoggerError(...args) })
}))

const serviceName = 'Manage your packaging waste responsibilities'

describe('#context', () => {
  const mockRequest = { path: '/' }
  let contextResult

  describe('When webpack manifest file read succeeds', () => {
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

    test('Should provide expected context', () => {
      expect(contextResult).toEqual({
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

    describe('With valid asset path', () => {
      test('Should provide expected asset path', () => {
        expect(contextResult.getAssetPath('application.js')).toBe(
          '/public/javascripts/application.js'
        )
      })
    })

    describe('With invalid asset path', () => {
      test('Should provide expected asset', () => {
        expect(contextResult.getAssetPath('an-image.png')).toBe(
          '/public/an-image.png'
        )
      })
    })
  })

  describe('When webpack manifest file read fails', () => {
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

    test('Should log that the Webpack Manifest file is not available', () => {
      expect(mockLoggerError).toHaveBeenCalledWith(
        'Webpack assets-manifest.json not found'
      )
    })
  })
})

describe('#context cache', () => {
  const mockRequest = { path: '/' }
  let contextResult

  describe('Webpack manifest file cache', () => {
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

    test('Should read file', () => {
      expect(mockReadFileSync).toHaveBeenCalled()
    })

    test('Should provide expected context', () => {
      expect(contextResult).toEqual({
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
