import { beforeEach, describe, expect, test, vi } from 'vitest'

import { fetchJsonFromBackend } from './fetch-json-from-backend.js'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

/**
 * Creates a mock Hapi request object
 * @param {object} [options]
 * @param {string} [options.token] - Auth token to include in credentials
 * @returns {object} Mock request object
 */
const createMockRequest = (options = {}) => ({
  auth: {
    credentials: options.token ? { token: options.token } : undefined
  }
})

describe(fetchJsonFromBackend, () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('returns JSON data when backend responds successfully', async () => {
    const mockData = { status: 'validated', id: '123' }
    const mockRequest = createMockRequest({ token: 'test-token' })

    mockFetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(mockData)
    })

    const result = await fetchJsonFromBackend(mockRequest, '/v1/test', {
      method: 'GET'
    })

    expect(result).toStrictEqual(mockData)
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/v1/test'),
      expect.objectContaining({
        method: 'GET',
        headers: {
          Authorization: 'Bearer test-token',
          'Content-Type': 'application/json'
        }
      })
    )
  })

  test('includes Authorization header when token is available', async () => {
    const mockRequest = createMockRequest({ token: 'my-auth-token' })

    mockFetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({})
    })

    await fetchJsonFromBackend(mockRequest, '/v1/test', { method: 'GET' })

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer my-auth-token'
        })
      })
    )
  })

  test('omits Authorization header when no token is available', async () => {
    const mockRequest = createMockRequest()

    mockFetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({})
    })

    await fetchJsonFromBackend(mockRequest, '/v1/test', { method: 'GET' })

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: {
          'Content-Type': 'application/json'
        }
      })
    )
  })

  test('custom Authorization header overrides session token', async () => {
    const mockRequest = createMockRequest({ token: 'session-token' })

    mockFetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({})
    })

    await fetchJsonFromBackend(mockRequest, '/v1/test', {
      method: 'GET',
      headers: { Authorization: 'Bearer custom-token' }
    })

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer custom-token'
        })
      })
    )
  })

  test('merges custom headers with Content-Type', async () => {
    const mockRequest = createMockRequest({ token: 'test-token' })

    mockFetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({})
    })

    await fetchJsonFromBackend(mockRequest, '/v1/test', {
      method: 'POST',
      headers: { 'X-Custom': 'value' },
      body: JSON.stringify({ data: 'test' })
    })

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: {
          Authorization: 'Bearer test-token',
          'Content-Type': 'application/json',
          'X-Custom': 'value'
        }
      })
    )
  })

  test('throws Boom notFound error when backend returns 404', async () => {
    const mockRequest = createMockRequest()

    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      headers: new Map()
    })

    await expect(
      fetchJsonFromBackend(mockRequest, '/v1/missing')
    ).rejects.toMatchObject({
      isBoom: true,
      output: { statusCode: 404 }
    })
  })

  test('throws Boom error with matching status code for other HTTP errors', async () => {
    const mockRequest = createMockRequest()

    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      headers: new Map()
    })

    await expect(
      fetchJsonFromBackend(mockRequest, '/v1/broken')
    ).rejects.toMatchObject({
      isBoom: true,
      output: { statusCode: 500 }
    })
  })

  test('includes JSON payload in Boom error when backend returns JSON error body', async () => {
    const mockRequest = createMockRequest()
    const errorPayload = {
      statusCode: 400,
      error: 'Bad Request',
      message: 'Validation failed'
    }

    const headers = new Map([['content-type', 'application/json']])

    mockFetch.mockResolvedValue({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      headers: { get: (key) => headers.get(key) },
      json: vi.fn().mockResolvedValue(errorPayload)
    })

    await expect(
      fetchJsonFromBackend(mockRequest, '/v1/invalid')
    ).rejects.toMatchObject({
      isBoom: true,
      output: {
        statusCode: 400,
        payload: errorPayload
      }
    })
  })

  test('throws Boom internal error when fetch throws network error', async () => {
    const mockRequest = createMockRequest()

    mockFetch.mockRejectedValue(new Error('Network error'))

    await expect(
      fetchJsonFromBackend(mockRequest, '/v1/unreachable')
    ).rejects.toMatchObject({
      isBoom: true,
      output: { statusCode: 500 },
      message: expect.stringContaining('Network error')
    })
  })

  test('re-throws existing Boom errors without wrapping', async () => {
    const mockRequest = createMockRequest()
    const Boom = await import('@hapi/boom')
    const boomError = Boom.default.badRequest('Already a Boom error')

    mockFetch.mockRejectedValue(boomError)

    await expect(
      fetchJsonFromBackend(mockRequest, '/v1/test')
    ).rejects.toMatchObject({
      isBoom: true,
      output: { statusCode: 400 },
      message: 'Already a Boom error'
    })
  })
})
