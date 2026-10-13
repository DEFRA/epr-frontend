import { config } from '#config/config.js'
import { http, HttpResponse } from 'msw'
import { describe, expect } from 'vitest'

import { organisationNumber } from '#server/common/helpers/organisation-number.js'
import { year } from '#server/common/helpers/year.js'
import { test } from '#vite/fixtures/server.js'

import { fetchOrganisationWasteBalances } from './fetch-organisation-waste-balances.js'

const backendUrl = config.get('eprBackendUrl')

describe(fetchOrganisationWasteBalances, () => {
  test('keys each balance by its registration number', async ({ msw }) => {
    msw.use(
      http.get(`${backendUrl}/organisations/50002/waste-balances`, () =>
        HttpResponse.json([
          {
            registrationNumber: 'R26ER5001180041PL',
            year: 2026,
            amount: 20,
            availableAmount: 12.5
          }
        ])
      )
    )

    const result = await fetchOrganisationWasteBalances(
      organisationNumber(50002),
      year(2026),
      'test-id-token'
    )

    expect(result).toStrictEqual({
      R26ER5001180041PL: { year: 2026, amount: 20, availableAmount: 12.5 }
    })
  })

  test('asks for the year and sends the backend token', async ({ msw }) => {
    let search
    let authorization
    msw.use(
      http.get(
        `${backendUrl}/organisations/50002/waste-balances`,
        ({ request }) => {
          search = new URL(request.url).search
          authorization = request.headers.get('Authorization')
          return HttpResponse.json([])
        }
      )
    )

    await fetchOrganisationWasteBalances(
      organisationNumber(50002),
      year(2026),
      'test-id-token'
    )

    expect(search).toBe('?year=2026')
    expect(authorization).toBe('Bearer test-id-token')
  })
})
