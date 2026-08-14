import { config } from '#config/config.js'
import { test } from '#vite/fixtures/server.js'
import { http, HttpResponse } from 'msw'
import { describe, expect } from 'vitest'

import { fetchOrganisations } from './fetch-organisations.js'

const backendUrl = config.get('eprBackendUrl')
const backendToken = 'test-backend-token'

/** @import { SetupServerApi } from 'msw/node' */

/**
 * Captures the request the helper makes and answers it with an empty page, so
 * a test can assert on what was asked for rather than what came back.
 * @param {SetupServerApi} msw
 * @returns {() => URL}
 */
const captureRequest = (msw) => {
  /** @type {URL | undefined} */
  let captured

  msw.use(
    http.get(`${backendUrl}/v1/organisations`, ({ request }) => {
      captured = new URL(request.url)
      return HttpResponse.json({
        items: [],
        page: 1,
        pageSize: 50,
        totalItems: 0,
        totalPages: 0
      })
    })
  )

  return () => /** @type {URL} */ (captured)
}

describe(fetchOrganisations, () => {
  test('returns the page the backend answers with', async ({ msw }) => {
    const page = {
      items: [{ id: 'org-1' }],
      page: 2,
      pageSize: 50,
      totalItems: 60,
      totalPages: 2
    }

    msw.use(
      http.get(`${backendUrl}/v1/organisations`, () => HttpResponse.json(page))
    )

    await expect(
      fetchOrganisations({ page: 2, backendToken })
    ).resolves.toStrictEqual(page)
  })

  test('always asks for a page, so the backend never answers unpaginated', async ({
    msw
  }) => {
    const request = captureRequest(msw)

    await fetchOrganisations({ page: 3, backendToken })

    expect(request().searchParams.get('page')).toBe('3')
    expect(request().searchParams.get('pageSize')).toBe('50')
  })

  test('narrows the request to a search on organisation name', async ({
    msw
  }) => {
    const request = captureRequest(msw)

    await fetchOrganisations({ page: 1, search: 'Acme Waste', backendToken })

    expect(request().searchParams.get('search')).toBe('Acme Waste')
  })

  test('asks for every organisation when no search was entered', async ({
    msw
  }) => {
    const request = captureRequest(msw)

    await fetchOrganisations({ page: 1, search: '', backendToken })

    expect(request().searchParams.has('search')).toBe(false)
  })

  test('authorises the call with the session backend token', async ({
    msw
  }) => {
    /** @type {Request | undefined} */
    let captured

    msw.use(
      http.get(`${backendUrl}/v1/organisations`, ({ request }) => {
        captured = request
        return HttpResponse.json({ items: [], totalPages: 0 })
      })
    )

    await fetchOrganisations({ page: 1, backendToken })

    expect(/** @type {Request} */ (captured).headers.get('authorization')).toBe(
      'Bearer test-backend-token'
    )
  })
})
