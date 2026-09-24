import { config } from '#config/config.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { asHtml, documentOf, rowsOf } from '#server/common/test-helpers/dom.js'
import {
  CONFIDENTIAL_KEY,
  NOTICE,
  exporterOf,
  operator,
  regulator,
  regulatorWithoutMarketScope,
  reprocessorOf,
  totalsOf
} from '#server/common/test-helpers/market-insights-fixtures.js'
import { paths } from '#server/paths.js'
import { beforeEach, it } from '#vite/fixtures/server.js'
import { getAllByRole, getByRole, getByText } from '@testing-library/dom'
import { http, HttpResponse } from 'msw'
import { afterAll, beforeAll, describe, expect, vi } from 'vitest'

/** @import { ReprocessorExporterAggregate } from '../helpers/fetch-reprocessor-exporter-figures.js' */

const backendUrl = config.get('eprBackendUrl')
const nationFiguresUrl = `${backendUrl}/v1/market-insights/:year/:cadence/:period/reprocessor-exporter-figures/:nation`

/**
 * England's own figures, told apart from the UK fixture's by their tonnage, so
 * a page reading the UK route would fail rather than pass on figures that
 * happen to match. The Grand Total is not the sum of the materials, so a page
 * that summed them would fail too.
 * @type {ReprocessorExporterAggregate}
 */
const englandFigures = {
  meta: { generatedAt: '2026-04-10T09:30:00.000Z' },
  data: {
    months: {
      '2026-01': {
        reports: { expected: 4, submitted: 3 },
        figures: {
          plastic: {
            reprocessor: reprocessorOf(
              { tonnageReceived: 640.25 },
              {
                operatorCount: 4,
                submittingOperatorCount: 3,
                contributingOperatorCounts: { tonnageReceived: 1 }
              }
            ),
            exporter: exporterOf()
          }
        },
        totals: totalsOf({ reprocessor: { tonnageReceived: 700 } })
      },
      '2026-02': {
        reports: { expected: 4, submitted: 1 },
        figures: {
          plastic: { reprocessor: reprocessorOf(), exporter: exporterOf() }
        },
        totals: totalsOf()
      },
      '2026-03': {
        reports: { expected: 5, submitted: 0 },
        figures: {
          plastic: { reprocessor: reprocessorOf(), exporter: exporterOf() }
        },
        totals: totalsOf()
      }
    }
  }
}

const servesEngland = http.get(nationFiguresUrl, () =>
  HttpResponse.json(englandFigures)
)

describe('the England reprocessor and exporter figures page', () => {
  beforeAll(() => {
    // Only the clock, so the page reads a reporting year the test pins while
    // the server's own timers keep running.
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-04-10T09:00:00.000Z'))
    config.set('featureFlags.regulatorAccess', true)
    config.set('featureFlags.marketInsights', true)
  })

  afterAll(() => {
    vi.useRealTimers()
    config.set('featureFlags.regulatorAccess', false)
    config.set('featureFlags.marketInsights', false)
  })

  describe('a regulator', () => {
    beforeEach(({ msw }) => {
      msw.use(servesEngland)
    })

    it('asks for England through the reporting period, and for nothing else', async ({
      msw,
      server
    }) => {
      /** @type {URL[]} */
      const asked = []

      msw.use(
        http.get(`${backendUrl}/v1/market-insights/*`, ({ request }) => {
          asked.push(new URL(request.url))
          return HttpResponse.json(englandFigures)
        })
      )

      await server.inject({
        method: 'GET',
        url: paths.regulators.marketInsightsEngland,
        auth: regulator
      })

      expect(asked.map((url) => url.pathname)).toStrictEqual([
        '/v1/market-insights/2026/monthly/3/reprocessor-exporter-figures/england'
      ])
    })

    it('reads the figures England was served, under England’s own name', async ({
      server
    }) => {
      const { statusCode, result } = await server.inject({
        method: 'GET',
        url: paths.regulators.marketInsightsEngland,
        auth: regulator
      })

      expect(statusCode).toBe(statusCodes.ok)

      const body = documentOf(asHtml(result))

      expect(
        getByRole(body, 'heading', { level: 1 }).textContent.trim()
      ).toContain('Reprocessor and exporter figures: England')

      // Nothing else on the page says which operators England's figures are
      // narrowed to, so this sentence is what tells a reader what England
      // means here.
      expect(
        getByText(
          body,
          'These figures cover operators registered with the Environment Agency, the regulator for England.'
        )
      ).not.toBeNull()

      // A figure few operators contributed to is marked, and the key is the
      // description of the table it sits in.
      const januaryReprocessors = getByRole(body, 'table', {
        name: 'Reprocessor data for January 2026',
        description: CONFIDENTIAL_KEY
      })

      expect(rowsOf(januaryReprocessors)).toStrictEqual([
        [
          'Plastic',
          '640.25 [c]',
          '0.00',
          '0.00',
          '0.00',
          '0.00',
          '0.00',
          '0.00',
          '0.00',
          '£0.00',
          '£0.00'
        ],
        [
          'Grand Total',
          '700.00',
          '0.00',
          '0.00',
          '0.00',
          '0.00',
          '0.00',
          '0.00',
          '0.00',
          '£0.00',
          '- No average price is calculated'
        ]
      ])
    })

    it('says beneath each month how many of the monthly reports England was owed have been submitted', async ({
      server
    }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: paths.regulators.marketInsightsEngland,
        auth: regulator
      })

      expect(
        getAllByRole(documentOf(asHtml(result)), 'heading', { level: 2 })
          .filter((heading) => (heading.textContent ?? '').endsWith('2026'))
          .map((heading) =>
            (heading.nextElementSibling?.textContent ?? '').trim()
          )
      ).toStrictEqual([
        'Monthly reports submitted: 3 of 4',
        'Monthly reports submitted: 1 of 4',
        'Monthly reports submitted: 0 of 5'
      ])
    })

    it('leads back to the page listing the sets of figures', async ({
      server
    }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: paths.regulators.marketInsightsEngland,
        auth: regulator
      })

      const trail = getByRole(documentOf(asHtml(result)), 'navigation', {
        name: 'Breadcrumb'
      })

      expect(
        getAllByRole(trail, 'listitem').map((crumb) =>
          (crumb.textContent ?? '').trim()
        )
      ).toStrictEqual([
        'Market insights',
        'Reprocessor and exporter figures: England'
      ])
      expect(
        getByRole(trail, 'link', { name: 'Market insights' }).getAttribute(
          'href'
        )
      ).toBe(paths.regulators.marketInsights)
    })

    it('says the page is still being built, and how the figures are calculated', async ({
      server
    }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: paths.regulators.marketInsightsEngland,
        auth: regulator
      })

      const body = documentOf(asHtml(result))

      expect(getByText(body, NOTICE)).not.toBeNull()
      expect(
        getByRole(body, 'heading', { name: 'How the figures are calculated' })
      ).not.toBeNull()
      expect(
        getByRole(body, 'heading', { name: 'Figures from few operators' })
      ).not.toBeNull()
    })
  })

  describe('an operator', () => {
    it('is refused the page, and asks the backend for nothing', async ({
      msw,
      server
    }) => {
      const asked = vi.fn()

      msw.use(
        http.get(nationFiguresUrl, () => {
          asked()
          return HttpResponse.json(englandFigures)
        })
      )

      const { statusCode } = await server.inject({
        method: 'GET',
        url: paths.regulators.marketInsightsEngland,
        auth: operator
      })

      expect(statusCode).toBe(statusCodes.forbidden)
      expect(asked).not.toHaveBeenCalled()
    })
  })

  describe('a session the backend granted no market data scope', () => {
    it('is refused the page, whatever role it carries', async ({ server }) => {
      const { statusCode } = await server.inject({
        method: 'GET',
        url: paths.regulators.marketInsightsEngland,
        auth: regulatorWithoutMarketScope
      })

      expect(statusCode).toBe(statusCodes.forbidden)
    })
  })
})
