import { beforeEach, describe, expect, it, vi } from 'vitest'

import { fetchJsonFromBackend } from './fetch-json-from-backend.js'

vi.mock(import('./fetch-json.js'))

const { fetchJson } = await import('./fetch-json.js')

describe(fetchJsonFromBackend, () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should prepend backend URL to relative paths', async () => {
    vi.mocked(fetchJson).mockResolvedValue({ data: 'test' })

    await fetchJsonFromBackend('/v1/test', { method: 'GET' })

    expect(fetchJson).toHaveBeenCalledWith(
      expect.stringMatching(/^http.*\/v1\/test$/),
      { method: 'GET' }
    )
  })

  it('should use absolute URLs as-is', async () => {
    vi.mocked(fetchJson).mockResolvedValue({ data: 'test' })

    await fetchJsonFromBackend('https://external.api.com/endpoint', {
      method: 'GET'
    })

    expect(fetchJson).toHaveBeenCalledWith(
      'https://external.api.com/endpoint',
      {
        method: 'GET'
      }
    )
  })

  it('should return response from fetchJson', async () => {
    const mockResponse = { status: 'validated', id: '123' }
    vi.mocked(fetchJson).mockResolvedValue(mockResponse)

    const result = await fetchJsonFromBackend('/v1/test')

    expect(result).toStrictEqual(mockResponse)
  })

  it('should propagate errors from fetchJson', async () => {
    const mockError = new Error('fetch failed')
    vi.mocked(fetchJson).mockRejectedValue(mockError)

    await expect(fetchJsonFromBackend('/v1/test')).rejects.toThrowError(
      'fetch failed'
    )
  })
})
