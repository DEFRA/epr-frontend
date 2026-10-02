import { config } from '#config/config.js'
import { test } from '#vite/fixtures/server.js'
import { http, HttpResponse } from 'msw'
import { describe, expect } from 'vitest'

import { fetchOutstandingReturns } from './fetch-outstanding-returns.js'

/** @import { OutstandingReturnsAggregate } from './fetch-outstanding-returns.js' */

const backendUrl = config.get('eprBackendUrl')
const outstandingReturnsUrl = `${backendUrl}/v1/market-insights/:year/:cadence/:period/outstanding-returns`
const backendToken = 'test-backend-token'

/** @type {OutstandingReturnsAggregate} */
const januaryAggregate = {
  meta: { generatedAt: '2026-04-10T09:00:00.000Z' },
  data: {
    months: {
      '2026-01': {
        figures: {
          plastic: {
            up_to_500: 0,
            up_to_5000: 1,
            up_to_10000: 0,
            over_10000: 2
          }
        }
      }
    }
  }
}

describe(fetchOutstandingReturns, () => {
  test('returns the aggregate the backend answers with', async ({ msw }) => {
    msw.use(
      http.get(outstandingReturnsUrl, () => HttpResponse.json(januaryAggregate))
    )

    await expect(
      fetchOutstandingReturns({ year: 2026, month: 1, backendToken })
    ).resolves.toStrictEqual(januaryAggregate)
  })

  test('asks for the monthly reporting period it was given', async ({
    msw
  }) => {
    /** @type {URL | undefined} */
    let captured

    msw.use(
      http.get(outstandingReturnsUrl, ({ request }) => {
        captured = new URL(request.url)
        return HttpResponse.json(januaryAggregate)
      })
    )

    await fetchOutstandingReturns({ year: 2025, month: 3, backendToken })

    expect(/** @type {URL} */ (captured).pathname).toBe(
      '/v1/market-insights/2025/monthly/3/outstanding-returns'
    )
  })

  test('authorises the call with the session backend token', async ({
    msw
  }) => {
    /** @type {Request | undefined} */
    let captured

    msw.use(
      http.get(outstandingReturnsUrl, ({ request }) => {
        captured = request
        return HttpResponse.json(januaryAggregate)
      })
    )

    await fetchOutstandingReturns({ year: 2026, month: 1, backendToken })

    expect(/** @type {Request} */ (captured).headers.get('authorization')).toBe(
      'Bearer test-backend-token'
    )
  })
})
