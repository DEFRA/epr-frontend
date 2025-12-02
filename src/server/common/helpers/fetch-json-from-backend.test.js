import { beforeEach, describe, expect, test, vi } from 'vitest'

import { fetchJsonFromBackend } from './fetch-json-from-backend.js'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe(fetchJsonFromBackend, () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('returns JSON data when backend responds successfully', async () => {
    const mockData = { status: 'validated', id: '123' }

    mockFetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(mockData)
    })

    const result = await fetchJsonFromBackend('/v1/test', { method: 'GET' })

    expect(result).toStrictEqual(mockData)
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/v1/test'),
      expect.objectContaining({
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      })
    )
  })

  test('merges custom headers with Content-Type', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({})
    })

    await fetchJsonFromBackend('/v1/test', {
      method: 'POST',
      headers: { 'X-Custom': 'value' },
      body: JSON.stringify({ data: 'test' })
    })

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: {
          'Content-Type': 'application/json',
          'X-Custom': 'value'
        }
      })
    )
  })

  test('throws Boom notFound error when backend returns 404', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      headers: new Map()
    })

    await expect(fetchJsonFromBackend('/v1/missing')).rejects.toMatchObject({
      isBoom: true,
      output: { statusCode: 404 }
    })
  })

  test('throws Boom error with matching status code for other HTTP errors', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      headers: new Map()
    })

    await expect(fetchJsonFromBackend('/v1/broken')).rejects.toMatchObject({
      isBoom: true,
      output: { statusCode: 500 }
    })
  })

  test('includes JSON payload in Boom error when backend returns JSON error body', async () => {
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

    await expect(fetchJsonFromBackend('/v1/invalid')).rejects.toMatchObject({
      isBoom: true,
      output: {
        statusCode: 400,
        payload: errorPayload
      }
    })
  })

  test('throws Boom internal error when fetch throws network error', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'))

    await expect(fetchJsonFromBackend('/v1/unreachable')).rejects.toMatchObject(
      {
        isBoom: true,
        output: { statusCode: 500 },
        message: expect.stringContaining('Network error')
      }
    )
  })

  test('re-throws existing Boom errors without wrapping', async () => {
    const Boom = await import('@hapi/boom')
    const boomError = Boom.default.badRequest('Already a Boom error')

    mockFetch.mockRejectedValue(boomError)

    await expect(fetchJsonFromBackend('/v1/test')).rejects.toMatchObject({
      isBoom: true,
      output: { statusCode: 400 },
      message: 'Already a Boom error'
    })
  })
})
