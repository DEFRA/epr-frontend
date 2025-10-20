import { describe, test, expect, vi, beforeEach } from 'vitest'
import middleware from 'i18next-http-middleware'
import { i18nPlugin } from './i18next.js'

vi.mock('i18next-http-middleware', () => ({
  default: {
    handle: vi.fn()
  }
}))

describe('i18nPlugin', () => {
  const mockServer = { ext: vi.fn() }
  const mockI18n = {
    t: vi.fn(),
    changeLanguage: vi.fn()
  }
  const mockI18next = {}
  const mockH = { continue: Symbol('continue') }

  beforeEach(() => {
    vi.clearAllMocks()
    middleware.handle.mockReturnValue((req, res, next) => {
      req.i18n = mockI18n
      next()
    })
  })

  test('registers onRequest and onPreResponse hooks', async () => {
    await i18nPlugin.register(mockServer, { i18next: mockI18next })
    expect(mockServer.ext).toHaveBeenCalledWith(
      'onRequest',
      expect.any(Function)
    )
    expect(mockServer.ext).toHaveBeenCalledWith(
      'onPreResponse',
      expect.any(Function)
    )
  })

  test('handles /cy path by changing language to Welsh and stripping prefix', async () => {
    await i18nPlugin.register(mockServer, { i18next: mockI18next })
    const onRequest = mockServer.ext.mock.calls.find(
      ([event]) => event === 'onRequest'
    )[1]

    const mockRequest = {
      raw: { req: {}, res: {} },
      path: '/cy/test',
      setUrl: vi.fn()
    }

    const result = await onRequest(mockRequest, mockH)

    expect(mockRequest.i18n.changeLanguage).toHaveBeenCalledWith('cy')
    expect(mockRequest.setUrl).toHaveBeenCalledWith('/test')
    expect(result).toBe(mockH.continue)
  })

  test('defaults to English when path does not start with /cy', async () => {
    await i18nPlugin.register(mockServer, { i18next: mockI18next })
    const onRequest = mockServer.ext.mock.calls.find(
      ([event]) => event === 'onRequest'
    )[1]

    const mockRequest = {
      raw: { req: {}, res: {} },
      path: '/en/test'
    }

    const result = await onRequest(mockRequest, mockH)
    expect(mockRequest.i18n.changeLanguage).toHaveBeenCalledWith('en')
    expect(result).toBe(mockH.continue)
  })

  test('handles root /cy path by changing language to Welsh and setting URL to /', async () => {
    await i18nPlugin.register(mockServer, { i18next: mockI18next })
    const onRequest = mockServer.ext.mock.calls.find(
      ([event]) => event === 'onRequest'
    )[1]

    const mockRequest = {
      raw: { req: {}, res: {} },
      path: '/cy',
      setUrl: vi.fn()
    }

    const result = await onRequest(mockRequest, mockH)

    expect(mockRequest.i18n.changeLanguage).toHaveBeenCalledWith('cy')
    expect(mockRequest.setUrl).toHaveBeenCalledWith('/')
    expect(result).toBe(mockH.continue)
  })

  test('injects translation context into views', async () => {
    await i18nPlugin.register(mockServer, { i18next: mockI18next })
    const onPreResponse = mockServer.ext.mock.calls.find(
      ([event]) => event === 'onPreResponse'
    )[1]

    const mockRequest = {
      t: vi.fn(),
      i18n: { language: 'cy' },
      response: { source: { context: {} } }
    }

    const result = await onPreResponse(mockRequest, mockH)
    expect(mockRequest.response.source.context.t).toBe(mockRequest.t)
    expect(mockRequest.response.source.context.language).toBe('cy')
    expect(result).toBe(mockH.continue)
  })
})
