import { config } from '#config/config.js'
import { http, HttpResponse } from 'msw'
import { describe, expect } from 'vitest'

import { toBackendToken } from '#server/common/helpers/backend-token.js'
import { toOrganisationNumber } from '#server/common/helpers/organisation-number.js'
import { test } from '#vite/fixtures/server.js'

import { fetchOrganisationYears } from './fetch-organisation-years.js'

const backendUrl = config.get('eprBackendUrl')

const backendToken = toBackendToken('test-id-token')

describe(fetchOrganisationYears, () => {
  test('returns the years from the backend', async ({ msw }) => {
    msw.use(
      http.get(`${backendUrl}/organisations/50002/years`, () =>
        HttpResponse.json({ years: [2027, 2026] })
      )
    )

    const result = await fetchOrganisationYears(
      toOrganisationNumber('50002'),
      backendToken
    )

    expect(result).toStrictEqual([2027, 2026])
  })

  test('keeps the organisation number inside its own path segment', async ({
    msw
  }) => {
    let pathname
    msw.use(
      http.get(`${backendUrl}/*`, ({ request }) => {
        pathname = new URL(request.url).pathname
        return HttpResponse.json({ years: [] })
      })
    )

    await fetchOrganisationYears(toOrganisationNumber('../admin'), backendToken)

    expect(pathname).toBe('/organisations/..%2Fadmin/years')
  })
})
