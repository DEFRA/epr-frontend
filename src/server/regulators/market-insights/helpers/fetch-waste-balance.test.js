import { config } from '#config/config.js'
import { test } from '#vite/fixtures/server.js'
import { http, HttpResponse } from 'msw'
import { describe, expect } from 'vitest'

import { fetchWasteBalance } from './fetch-waste-balance.js'

/**
 * @import { WasteBalanceAggregate } from './fetch-waste-balance.js'
 * @import { WasteBalanceFigure } from './to-waste-balance-table.js'
 */

const backendUrl = config.get('eprBackendUrl')
const wasteBalanceUrl = `${backendUrl}/v1/market-insights/:year/:cadence/:period/waste-balance`
const backendToken = 'test-backend-token'

/** @type {WasteBalanceFigure} */
const glassInJanuary = {
  material: 'Glass Re-melt',
  accreditationType: 'reprocessor',
  month: '2026-01',
  totalCredited: 120,
  eligibleForWasteBalance: 100,
  sentOnDeductions: 10,
  netCredit: 90
}

/**
 * @param {WasteBalanceFigure[]} figures
 * @returns {WasteBalanceAggregate}
 */
const aggregateOf = (figures) => ({
  meta: { generatedAt: '2026-04-10T09:00:00.000Z' },
  data: figures
})

describe(fetchWasteBalance, () => {
  test('returns the aggregate the backend answers with', async ({ msw }) => {
    const aggregate = aggregateOf([glassInJanuary])

    msw.use(http.get(wasteBalanceUrl, () => HttpResponse.json(aggregate)))

    await expect(
      fetchWasteBalance({ year: 2026, month: 1, backendToken })
    ).resolves.toStrictEqual(aggregate)
  })

  test('asks for the monthly reporting period it was given', async ({
    msw
  }) => {
    /** @type {URL | undefined} */
    let captured

    msw.use(
      http.get(wasteBalanceUrl, ({ request }) => {
        captured = new URL(request.url)
        return HttpResponse.json(aggregateOf([]))
      })
    )

    await fetchWasteBalance({ year: 2025, month: 3, backendToken })

    expect(/** @type {URL} */ (captured).pathname).toBe(
      '/v1/market-insights/2025/monthly/3/waste-balance'
    )
  })

  test('authorises the call with the session backend token', async ({
    msw
  }) => {
    /** @type {Request | undefined} */
    let captured

    msw.use(
      http.get(wasteBalanceUrl, ({ request }) => {
        captured = request
        return HttpResponse.json(aggregateOf([]))
      })
    )

    await fetchWasteBalance({ year: 2026, month: 1, backendToken })

    expect(/** @type {Request} */ (captured).headers.get('authorization')).toBe(
      'Bearer test-backend-token'
    )
  })
})
