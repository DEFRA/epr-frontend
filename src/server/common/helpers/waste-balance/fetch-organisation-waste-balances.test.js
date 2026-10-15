import { config } from '#config/config.js'
import { http, HttpResponse } from 'msw'
import { describe, expect } from 'vitest'

import { organisationNumber } from '#server/common/helpers/organisation-number.js'
import { year } from '#server/common/helpers/year.js'
import { test } from '#vite/fixtures/server.js'

import { fetchOrganisationWasteBalances } from './fetch-organisation-waste-balances.js'

const backendUrl = config.get('eprBackendUrl')

describe(fetchOrganisationWasteBalances, () => {
  test('returns the year’s balances keyed by accreditation number', async ({
    msw
  }) => {
    msw.use(
      http.get(`${backendUrl}/organisations/50002/waste-balances/2026`, () =>
        HttpResponse.json({
          A26ER5001180114PL: { amount: 20, availableAmount: 12.5 }
        })
      )
    )

    const result = await fetchOrganisationWasteBalances(
      organisationNumber(50002),
      year(2026),
      'test-id-token'
    )

    expect(result).toStrictEqual({
      A26ER5001180114PL: { amount: 20, availableAmount: 12.5 }
    })
  })
})
