import { config } from '#config/config.js'
import { totalsOf } from '#server/common/test-helpers/market-insights-fixtures.js'
import { test } from '#vite/fixtures/server.js'
import { http, HttpResponse } from 'msw'
import { describe, expect } from 'vitest'

import { fetchReprocessorExporterFigures } from './fetch-reprocessor-exporter-figures.js'

/** @import { ReprocessorExporterAggregate } from './fetch-reprocessor-exporter-figures.js' */

const backendUrl = config.get('eprBackendUrl')
const figuresUrl = `${backendUrl}/v1/market-insights/:year/:cadence/:period/reprocessor-exporter-figures`
const backendToken = 'test-backend-token'

/** @type {ReprocessorExporterAggregate} */
const januaryAggregate = {
  meta: { generatedAt: '2026-03-02T09:15:00.000Z' },
  data: {
    months: {
      '2026-01': {
        reports: { expected: 3, submitted: 2 },
        figures: {
          plastic: {
            reprocessor: {
              tonnageReceived: 1250.5,
              tonnageRecycled: 1100,
              tonnageReceivedButNotRecycled: 150.5,
              tonnageSentOnTotal: 50.25,
              tonnageSentOnToReprocessor: 40,
              tonnageSentOnToExporter: 0,
              tonnageSentOnToOtherFacilities: 10.25,
              revisedTonnageIssued: 900,
              totalRevenue: 108000,
              averagePricePerTonne: 120,
              operatorCount: 4,
              submittingOperatorCount: 2
            },
            exporter: {
              tonnageReceived: 300,
              tonnageExported: 280,
              tonnageReceivedButNotExported: 20,
              tonnageSentOnTotal: 0,
              tonnageSentOnToReprocessor: 0,
              tonnageSentOnToExporter: 0,
              tonnageSentOnToOtherFacilities: 0,
              tonnageStopped: 0,
              tonnageRefused: 0,
              tonnageRepatriated: 0,
              revisedTonnageIssued: 0,
              totalRevenue: 0,
              averagePricePerTonne: 0,
              operatorCount: 1,
              submittingOperatorCount: 1
            }
          }
        },
        totals: totalsOf()
      }
    }
  }
}

describe(fetchReprocessorExporterFigures, () => {
  test('returns the aggregate the backend answers with', async ({ msw }) => {
    msw.use(http.get(figuresUrl, () => HttpResponse.json(januaryAggregate)))

    await expect(
      fetchReprocessorExporterFigures({ year: 2026, month: 1, backendToken })
    ).resolves.toStrictEqual(januaryAggregate)
  })

  test('asks for the monthly reporting period it was given', async ({
    msw
  }) => {
    /** @type {URL | undefined} */
    let captured

    msw.use(
      http.get(figuresUrl, ({ request }) => {
        captured = new URL(request.url)
        return HttpResponse.json(januaryAggregate)
      })
    )

    await fetchReprocessorExporterFigures({
      year: 2025,
      month: 3,
      backendToken
    })

    expect(/** @type {URL} */ (captured).pathname).toBe(
      '/v1/market-insights/2025/monthly/3/reprocessor-exporter-figures'
    )
  })

  test('asks for a nation as a sibling of the UK figures', async ({ msw }) => {
    /** @type {URL | undefined} */
    let captured

    msw.use(
      http.get(`${figuresUrl}/:nation`, ({ request }) => {
        captured = new URL(request.url)
        return HttpResponse.json(januaryAggregate)
      })
    )

    await fetchReprocessorExporterFigures({
      year: 2026,
      month: 3,
      nation: 'northern-ireland',
      backendToken
    })

    expect(/** @type {URL} */ (captured).pathname).toBe(
      '/v1/market-insights/2026/monthly/3/reprocessor-exporter-figures/northern-ireland'
    )
  })

  test('authorises the call with the session backend token', async ({
    msw
  }) => {
    /** @type {Request | undefined} */
    let captured

    msw.use(
      http.get(figuresUrl, ({ request }) => {
        captured = request
        return HttpResponse.json(januaryAggregate)
      })
    )

    await fetchReprocessorExporterFigures({
      year: 2026,
      month: 1,
      backendToken
    })

    expect(/** @type {Request} */ (captured).headers.get('authorization')).toBe(
      'Bearer test-backend-token'
    )
  })
})
