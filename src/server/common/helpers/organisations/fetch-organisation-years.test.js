import { config } from '#config/config.js'
import { http, HttpResponse } from 'msw'
import { describe, expect } from 'vitest'

import { organisationNumber } from '#server/common/helpers/organisation-number.js'
import { test } from '#vite/fixtures/server.js'

import { fetchOrganisationYears } from './fetch-organisation-years.js'

const backendUrl = config.get('eprBackendUrl')

describe(fetchOrganisationYears, () => {
  test('returns the years from the backend', async ({ msw }) => {
    msw.use(
      http.get(`${backendUrl}/organisations/50002/years`, () =>
        HttpResponse.json({ years: [2027, 2026] })
      )
    )

    const result = await fetchOrganisationYears(
      organisationNumber(50002),
      'test-id-token'
    )

    expect(result).toStrictEqual([2027, 2026])
  })
})
