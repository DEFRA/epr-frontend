import { beforeEach, describe, expect, it, vi } from 'vitest'

import { fetchRedirectFromBackend } from './fetch-redirect-from-backend.js'

const path =
  '/v1/organisations/org-1/registrations/reg-1/summary-logs/log-1/file'
const options = { headers: { Authorization: 'Bearer token-1' } }

/**
 * @param {{ status?: number, location?: string | null }} [response]
 */
const backendAnswers = ({
  status = 302,
  location = 'https://s3/signed'
} = {}) =>
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      status,
      headers: { get: (name) => (name === 'location' ? location : null) }
    })
  )

describe(fetchRedirectFromBackend, () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  it('answers the location the backend redirected to', async () => {
    backendAnswers()

    await expect(fetchRedirectFromBackend(path, options)).resolves.toBe(
      'https://s3/signed'
    )
  })

  it('does not follow the redirect', async () => {
    backendAnswers()

    await fetchRedirectFromBackend(path, options)

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining(path),
      expect.objectContaining({ redirect: 'manual' })
    )
  })

  it('sends the caller-supplied headers on to the backend', async () => {
    backendAnswers()

    await fetchRedirectFromBackend(path, options)

    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer token-1' })
      })
    )
  })

  // A backend that answers without a Location is not something this can
  // recover from, and it is upstream's fault rather than the caller's.
  it('fails with a 502 where the backend named no location', async () => {
    backendAnswers({ location: null })

    await expect(fetchRedirectFromBackend(path, options)).rejects.toMatchObject(
      {
        isBoom: true,
        output: { statusCode: 502 },
        code: 'external_redirect_invalid'
      }
    )
  })

  it('fails with a 500 where the fetch itself threw', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('boom')))

    await expect(fetchRedirectFromBackend(path, options)).rejects.toMatchObject(
      {
        isBoom: true,
        output: { statusCode: 500 },
        code: 'external_fetch_failed'
      }
    )
  })

  it('lets an existing Boom through untouched', async () => {
    const boom = Object.assign(new Error('already boom'), {
      isBoom: true,
      output: { statusCode: 418 }
    })
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(() => {
        throw boom
      })
    )

    await expect(fetchRedirectFromBackend(path, options)).rejects.toBe(boom)
  })
})
