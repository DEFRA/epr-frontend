import { beforeEach, describe, expect, it, vi } from 'vitest'

import { deleteFromBackend } from './delete-from-backend.js'

const mockFetch = vi.fn()
globalThis.fetch = mockFetch

describe(deleteFromBackend, () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('sends DELETE request to backend URL', async () => {
    mockFetch.mockResolvedValue({ ok: true, status: 204 })

    await deleteFromBackend('/v1/test')

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringMatching(/^http.*\/v1\/test$/),
      expect.objectContaining({ method: 'DELETE' })
    )
  })

  it('passes auth headers through', async () => {
    mockFetch.mockResolvedValue({ ok: true, status: 204 })

    await deleteFromBackend('/v1/test', {
      headers: { Authorization: 'Bearer token' }
    })

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer token'
        })
      })
    )
  })

  it('resolves without a return value on success', async () => {
    mockFetch.mockResolvedValue({ ok: true, status: 204 })

    const result = await deleteFromBackend('/v1/test')

    expect(result).toBeUndefined()
  })

  it('throws Boom error on non-ok response', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      headers: { get: () => null }
    })

    await expect(deleteFromBackend('/v1/test')).rejects.toMatchObject({
      isBoom: true,
      output: { statusCode: 404 }
    })
  })

  it('includes JSON error payload when content-type is application/json', async () => {
    const errorPayload = { message: 'Report not found' }
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      headers: {
        get: (name) => (name === 'content-type' ? 'application/json' : null)
      },
      json: () => Promise.resolve(errorPayload)
    })

    await expect(deleteFromBackend('/v1/test')).rejects.toMatchObject({
      isBoom: true,
      output: {
        statusCode: 404,
        payload: errorPayload
      }
    })
  })

  it('throws Boom internal on network error', async () => {
    mockFetch.mockRejectedValue(new Error('ECONNREFUSED'))

    await expect(deleteFromBackend('/v1/test')).rejects.toMatchObject({
      isBoom: true,
      output: { statusCode: 500 }
    })
  })
})
