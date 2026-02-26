import { http, HttpResponse } from 'msw'
import { describe, expect, vi } from 'vitest'

import { it } from '#vite/fixtures/server.js'

import { fetchJson } from './fetch-json.js'

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
  it('should return JSON data when response is successful', async ({ msw }) => {
    const mockData = { status: 'validated', id: '123' }

    let capturedRequest
    msw.use(
      http.get('https://api.example.com/test', ({ request }) => {
        capturedRequest = request
        return HttpResponse.json(mockData)
      })
    )

    const result = await fetchJson('https://api.example.com/test', {
      method: 'GET'
    })

    expect(result).toStrictEqual(mockData)
    expect(capturedRequest.headers.get('content-type')).toBe('application/json')
    expect(capturedRequest.headers.get('x-cdp-request-id')).toBe(MOCK_TRACE_ID)
  })

  it('should merge custom headers with Content-Type', async ({ msw }) => {
    let capturedRequest
    msw.use(
      http.post('https://api.example.com/test', ({ request }) => {
        capturedRequest = request
        return HttpResponse.json({})
      })
    )

    await fetchJson('https://api.example.com/test', {
      method: 'POST',
      headers: { 'X-Custom': 'value' },
      body: JSON.stringify({ data: 'test' })
    })

    expect(capturedRequest.headers.get('content-type')).toBe('application/json')
    expect(capturedRequest.headers.get('x-custom')).toBe('value')
    expect(capturedRequest.headers.get('x-cdp-request-id')).toBe(MOCK_TRACE_ID)
  })

  it('should throw Boom notFound error when response is 404', async ({
    msw
  }) => {
    msw.use(
      http.get('https://api.example.com/missing', () => {
        return new HttpResponse(null, {
          status: 404,
          statusText: 'Not Found'
        })
      })
    )

    await expect(
      fetchJson('https://api.example.com/missing')
    ).rejects.toMatchObject({
      isBoom: true,
      output: { statusCode: 404 }
    })
  })

  it('should throw Boom error with matching status code for other HTTP errors', async ({
    msw
  }) => {
    msw.use(
      http.get('https://api.example.com/broken', () => {
        return new HttpResponse(null, {
          status: 500,
          statusText: 'Internal Server Error'
        })
      })
    )

    await expect(
      fetchJson('https://api.example.com/broken')
    ).rejects.toMatchObject({
      isBoom: true,
      output: { statusCode: 500 }
    })
  })

  it('should include JSON payload in Boom error when response returns JSON error body', async ({
    msw
  }) => {
    const errorPayload = {
      statusCode: 400,
      error: 'Bad Request',
      message: 'Validation failed'
    }

    msw.use(
      http.get('https://api.example.com/invalid', () => {
        return HttpResponse.json(errorPayload, { status: 400 })
      })
    )

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

  it('should throw Boom internal error when fetch throws network error', async ({
    msw
  }) => {
    msw.use(
      http.get('https://api.example.com/unreachable', () => {
        return HttpResponse.error()
      })
    )

    await expect(
      fetchJson('https://api.example.com/unreachable')
    ).rejects.toMatchObject({
      isBoom: true,
      output: { statusCode: 500 },
      message: expect.stringContaining('https://api.example.com/unreachable')
    })
  })

  it('should re-throw existing Boom errors without wrapping', async ({
    msw
  }) => {
    msw.use(
      http.get('https://api.example.com/test', () => {
        return new HttpResponse(null, {
          status: 400,
          statusText: 'Bad Request'
        })
      })
    )

    await expect(
      fetchJson('https://api.example.com/test')
    ).rejects.toMatchObject({
      isBoom: true,
      output: { statusCode: 400 },
      message: expect.stringContaining('400')
    })
  })
})
