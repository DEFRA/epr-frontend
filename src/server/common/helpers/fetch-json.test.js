import { beforeEach, describe, expect, it, vi } from 'vitest'

import { fetchJson } from './fetch-json.js'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

const MOCK_TRACE_ID = 'mock-trace-id-1'

vi.mock(import('@defra/hapi-tracing'), () => ({
  withTraceId: vi.fn((headerName, headers = {}) => {
    headers[headerName] = 'mock-trace-id-1'
    return headers
  }),
  tracing: {
    plugin: {}
  }
}))

describe(fetchJson, () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return JSON data when response is successful', async () => {
    const mockData = { status: 'validated', id: '123' }

    mockFetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(mockData)
    })

    const result = await fetchJson('https://api.example.com/test', {
      method: 'GET'
    })

    expect(result).toStrictEqual(mockData)
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.example.com/test',
      expect.objectContaining({
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-cdp-request-id': MOCK_TRACE_ID
        }
      })
    )
  })

  it('should merge custom headers with Content-Type', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({})
    })

    await fetchJson('https://api.example.com/test', {
      method: 'POST',
      headers: { 'X-Custom': 'value' },
      body: JSON.stringify({ data: 'test' })
    })

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: {
          'Content-Type': 'application/json',
          'X-Custom': 'value',
          'x-cdp-request-id': MOCK_TRACE_ID
        }
      })
    )
  })

  it('should throw Boom notFound error when response is 404', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      headers: new Map()
    })

    await expect(
      fetchJson('https://api.example.com/missing')
    ).rejects.toMatchObject({
      isBoom: true,
      output: { statusCode: 404 }
    })
  })

  it('should throw Boom error with matching status code for other HTTP errors', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      headers: new Map()
    })

    await expect(
      fetchJson('https://api.example.com/broken')
    ).rejects.toMatchObject({
      isBoom: true,
      output: { statusCode: 500 }
    })
  })

  it('should include JSON payload in Boom error when response returns JSON error body', async () => {
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
      fetchJson('https://api.example.com/invalid')
    ).rejects.toMatchObject({
      isBoom: true,
      output: {
        statusCode: 400,
        payload: errorPayload
      }
    })
  })

  it('should throw Boom internal error when fetch throws network error', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'))

    await expect(
      fetchJson('https://api.example.com/unreachable')
    ).rejects.toMatchObject({
      isBoom: true,
      output: { statusCode: 500 },
      message: expect.stringContaining('Network error')
    })
  })

  it('should re-throw existing Boom errors without wrapping', async () => {
    const Boom = await import('@hapi/boom')
    const boomError = Boom.default.badRequest('Already a Boom error')

    mockFetch.mockRejectedValue(boomError)

    await expect(
      fetchJson('https://api.example.com/test')
    ).rejects.toMatchObject({
      isBoom: true,
      output: { statusCode: 400 },
      message: 'Already a Boom error'
    })
  })
})
