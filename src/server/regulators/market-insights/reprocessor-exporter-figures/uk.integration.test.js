import { config } from '#config/config.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import {
  asHtml,
  documentOf,
  headingsOf,
  rowsOf
} from '#server/common/test-helpers/dom.js'
import {
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

/**
 * @import { ReprocessorExporterAggregate } from '../helpers/fetch-reprocessor-exporter-figures.js'
 * @import { ExporterFigures, ReprocessorFigures } from '../helpers/to-reprocessor-exporter-tables.js'
 */

const backendUrl = config.get('eprBackendUrl')
const figuresUrl = `${backendUrl}/v1/market-insights/:year/:cadence/:period/reprocessor-exporter-figures`

/**
 * A month in which plastic was reprocessed and aluminium exported, every
 * other served figure at zero. The page shows whatever materials are served,
 * so two are enough to see both tables laid out.
 * @param {{ plastic: Partial<ReprocessorFigures>, aluminium: Partial<ExporterFigures> }} figures
 * @param {ReprocessorExporterAggregate['data']['months'][string]['reports']} [reports]
 * @param {ReprocessorExporterAggregate['data']['months'][string]['totals']} [totals]
 * @returns {ReprocessorExporterAggregate['data']['months'][string]}
 */
const figuresMonthOf = (
  { plastic, aluminium },
  reports = { expected: 0, submitted: 0 },
  totals = totalsOf()
) => ({
  reports,
  figures: {
    plastic: { reprocessor: reprocessorOf(plastic), exporter: exporterOf() },
    aluminium: {
      reprocessor: reprocessorOf(),
      exporter: exporterOf(aluminium)
    }
  },
  totals
})

/**
 * The served totals and averages deliberately do not reconcile with the
 * figures they would be derived from, so a page that recomputed any of them
 * would fail rather than pass by coincidence.
 * @type {ReprocessorExporterAggregate}
 */
const januaryToMarchFigures = {
  meta: { generatedAt: '2026-04-10T09:30:00.000Z' },
  data: {
    months: {
      '2026-01': figuresMonthOf(
        {
          plastic: {
            tonnageReceived: 1250.5,
            tonnageRecycled: 1100,
            tonnageReceivedButNotRecycled: 151,
            tonnageSentOnTotal: 51,
            tonnageSentOnToReprocessor: 40,
            tonnageSentOnToOtherFacilities: 10.25,
            revisedTonnageIssued: 900,
            totalRevenue: 108000,
            averagePricePerTonne: 121
          },
          aluminium: {
            tonnageReceived: 300,
            tonnageExported: 280,
            tonnageReceivedButNotExported: 21,
            tonnageStopped: 1.5,
            revisedTonnageIssued: 250,
            totalRevenue: 12345.68,
            averagePricePerTonne: 50
          }
        },
        { expected: 2, submitted: 1 },
        totalsOf({
          reprocessor: {
            tonnageReceived: 1300,
            tonnageRecycled: 1150,
            tonnageReceivedButNotRecycled: 160,
            tonnageSentOnTotal: 55,
            tonnageSentOnToReprocessor: 42,
            tonnageSentOnToOtherFacilities: 11,
            revisedTonnageIssued: 950,
            totalRevenue: 110000
          },
          exporter: {
            tonnageReceived: 310,
            tonnageExported: 290,
            tonnageReceivedButNotExported: 22,
            tonnageStopped: 2,
            revisedTonnageIssued: 260,
            totalRevenue: 12500
          }
        })
      ),
      '2026-02': figuresMonthOf(
        { plastic: {}, aluminium: {} },
        { expected: 2, submitted: 2 }
      ),
      '2026-03': figuresMonthOf(
        { plastic: {}, aluminium: {} },
        { expected: 3, submitted: 0 }
      )
    }
  }
}

const servesJanuaryToMarch = http.get(figuresUrl, () =>
  HttpResponse.json(januaryToMarchFigures)
)

describe('the UK reprocessor and exporter figures page', () => {
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
      msw.use(servesJanuaryToMarch)
    })

    it('gives every month served a heading, and a region the keyboard can scroll sideways', async ({
      server
    }) => {
      const { statusCode, result } = await server.inject({
        method: 'GET',
        url: paths.regulators.marketInsightsUk,
        auth: regulator
      })

      expect(statusCode).toBe(statusCodes.ok)

      const body = documentOf(asHtml(result))

      expect(
        getAllByRole(body, 'heading', { level: 2 })
          .map((heading) => (heading.textContent ?? '').trim())
          .filter((name) => name.endsWith('2026'))
      ).toStrictEqual(['January 2026', 'February 2026', 'March 2026'])

      // The tables are wider than the page, so they scroll sideways.
      expect(
        getByRole(body, 'region', { name: 'January 2026' }).getAttribute(
          'tabindex'
        )
      ).toBe('0')
    })

    it('says beneath each month how many of the monthly reports it was owed have been submitted, before its tables', async ({
      server
    }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: paths.regulators.marketInsightsUk,
        auth: regulator
      })

      const body = documentOf(asHtml(result))

      // Whatever sits between a month's heading and the region holding its
      // tables is what a regulator reads about that month before its figures.
      expect(
        getAllByRole(body, 'heading', { level: 2 })
          .filter((heading) => (heading.textContent ?? '').endsWith('2026'))
          .map((heading) => {
            /** @type {string[]} */
            const wording = []
            let element = heading.nextElementSibling
            while (
              element !== null &&
              element.getAttribute('role') !== 'region'
            ) {
              wording.push((element.textContent ?? '').trim())
              element = element.nextElementSibling
            }
            return wording
          })
      ).toStrictEqual([
        ['Monthly reports submitted: 1 of 2'],
        ['Monthly reports submitted: 2 of 2'],
        ['Monthly reports submitted: 0 of 3']
      ])
    })

    it('reads a reprocessor table for a month, the figures laid out the way the publication is', async ({
      server
    }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: paths.regulators.marketInsightsUk,
        auth: regulator
      })

      const [januaryReprocessors] = getAllByRole(
        documentOf(asHtml(result)),
        'table',
        { name: 'Reprocessor data for January 2026' }
      )

      expect(headingsOf(januaryReprocessors)).toStrictEqual([
        'Material',
        'Tonnage received for recycling',
        'Tonnage recycled',
        'Tonnage received but not recycled',
        'Tonnage sent on, total',
        'Tonnage sent on to a reprocessor',
        'Tonnage sent on to an exporter',
        'Tonnage sent on to other facilities',
        'Tonnage of PRNs issued, excluding those issued free of charge',
        'PRN revenue (£)',
        'Average PRN price per tonne (£)'
      ])
      expect(rowsOf(januaryReprocessors)).toStrictEqual([
        [
          'Aluminium',
          '0.00',
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
          'Plastic',
          '1,250.50',
          '1,100.00',
          '151.00',
          '51.00',
          '40.00',
          '0.00',
          '10.25',
          '900.00',
          '£108,000.00',
          '£121.00'
        ],
        [
          'Grand Total',
          '1,300.00',
          '1,150.00',
          '160.00',
          '55.00',
          '42.00',
          '0.00',
          '11.00',
          '950.00',
          '£110,000.00',
          '- No average price is calculated'
        ]
      ])

      // The dash is what the workbook prints, and is all a sighted reader
      // needs. A screen reader is told what the dash stands for instead.
      const cells = getAllByRole(januaryReprocessors, 'cell')
      const noAverage = cells[cells.length - 1]

      expect(getByText(noAverage, '-').getAttribute('aria-hidden')).toBe('true')
      expect(
        getByText(noAverage, 'No average price is calculated').classList
      ).toContain('govuk-visually-hidden')
    })

    it('reads an exporter table for a month, the figures laid out the way the publication is', async ({
      server
    }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: paths.regulators.marketInsightsUk,
        auth: regulator
      })

      const [januaryExporters] = getAllByRole(
        documentOf(asHtml(result)),
        'table',
        { name: 'Exporter data for January 2026' }
      )

      expect(headingsOf(januaryExporters)).toStrictEqual([
        'Material',
        'Tonnage received for exporting',
        'Tonnage exported for recycling',
        'Tonnage received but not exported',
        'Tonnage sent on, total',
        'Tonnage sent on to a reprocessor',
        'Tonnage sent on to an exporter',
        'Tonnage sent on to other facilities',
        'Tonnage exported that was stopped',
        'Tonnage exported that was refused',
        'Tonnage repatriated',
        'Tonnage of PERNs issued, excluding those issued free of charge',
        'PERN revenue (£)',
        'Average PERN price per tonne (£)'
      ])
      expect(rowsOf(januaryExporters)).toStrictEqual([
        [
          'Aluminium',
          '300.00',
          '280.00',
          '21.00',
          '0.00',
          '0.00',
          '0.00',
          '0.00',
          '1.50',
          '0.00',
          '0.00',
          '250.00',
          '£12,345.68',
          '£50.00'
        ],
        [
          'Plastic',
          '0.00',
          '0.00',
          '0.00',
          '0.00',
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
          '310.00',
          '290.00',
          '22.00',
          '0.00',
          '0.00',
          '0.00',
          '0.00',
          '2.00',
          '0.00',
          '0.00',
          '260.00',
          '£12,500.00',
          '- No average price is calculated'
        ]
      ])
    })

    it('states the period the figures cover and when they were taken', async ({
      server
    }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: paths.regulators.marketInsightsUk,
        auth: regulator
      })

      const body = documentOf(asHtml(result))

      expect(getByText(body, 'January to March 2026')).not.toBeNull()
      // The moment is served in UTC and read in UK time, which is an hour ahead
      // in April, so a page showing 9:30am would be showing the wrong zone.
      expect(
        getByText(body, 'Data taken at 10:30am on 10 April 2026')
      ).not.toBeNull()
    })

    it('says the page is still being built, above the description', async ({
      server
    }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: paths.regulators.marketInsightsUk,
        auth: regulator
      })

      const heading = getByRole(documentOf(asHtml(result)), 'heading', {
        level: 1
      })

      expect(heading.nextElementSibling?.textContent.trim()).toBe(NOTICE)
    })

    it('leads back to the page listing the sets of figures', async ({
      server
    }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: paths.regulators.marketInsightsUk,
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
        'Reprocessor and exporter figures: UK'
      ])
      expect(
        getByRole(trail, 'link', { name: 'Market insights' }).getAttribute(
          'href'
        )
      ).toBe(paths.regulators.marketInsights)
    })

    it('says what the figures are made of, and how they are calculated, before the tables', async ({
      server
    }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: paths.regulators.marketInsightsUk,
        auth: regulator
      })

      const body = documentOf(asHtml(result))

      // The wording runs from the notice to the first month's tables, so a
      // regulator reads it before the figures it explains.
      /** @type {string[]} */
      const wording = []
      let element = getByText(body, NOTICE).nextElementSibling
      while (element !== null && element.matches('p, h2')) {
        wording.push((element.textContent ?? '').trim())
        element = element.nextElementSibling
      }

      expect(element?.querySelector('table')).not.toBeNull()
      expect(wording).toStrictEqual([
        'For each month, the tables show what accredited reprocessors and exporters reported by material: tonnage received, recycled or exported, and sent on. They also show the tonnage PRNs and PERNs were issued for, the revenue from those notes and the average price per tonne. The monthly market insights workbook uses these figures.',
        'Data taken at 10:30am on 10 April 2026',
        'These figures are only as good as the reports operators have submitted. An operator that has not submitted a month adds nothing to it. The newest months are the least complete, because returns are still arriving. Each month says how many of the monthly reports it was owed have been submitted.',
        'How the figures are calculated',
        'The figures come from the monthly reports operators submit, not from the summary logs the UK waste balance uses. Quarterly reports do not count. Where an operator has submitted a month more than once, only the latest submission counts.',
        'A report counts only if the accreditation it was submitted under is currently approved or suspended. An accreditation that has since been cancelled loses every month it reported.',
        'Operators report notes issued free of charge separately, and that tonnage is excluded. Revenue and tonnage are each added up across all operators, then total revenue is divided by total tonnage to give the average price per tonne. Where no tonnage was issued, the average is 0.',
        'Revenue is what operators reported receiving, or expecting to receive, for their notes, excluding VAT.',
        'Each figure is rounded to two decimal places as it is added up. A total can differ by a few pence from the same figures added first and rounded once.',
        'Each table ends in a Grand Total row, which adds up every material. No average price is calculated for it, so that cell shows a dash.',
        'Each month shows a reprocessor table and an exporter table, and every material appears in both. A figure shows 0 where no operator reported activity, where operators reported but left that figure blank, and where a month has not been submitted.',
        'The figures are live. They come from the monthly reports held at the time shown above, not from a record of what was published. If an operator resubmits a month, its figures change.',
        'January 2026',
        'Monthly reports submitted: 1 of 2'
      ])
    })

    it('asks for the reporting period through the last complete month, and for nothing else', async ({
      msw,
      server
    }) => {
      /** @type {URL[]} */
      const asked = []

      msw.use(
        http.get(`${backendUrl}/v1/market-insights/*`, ({ request }) => {
          asked.push(new URL(request.url))
          return HttpResponse.json(januaryToMarchFigures)
        })
      )

      await server.inject({
        method: 'GET',
        url: paths.regulators.marketInsightsUk,
        auth: regulator
      })

      expect(asked.map((url) => url.pathname)).toStrictEqual([
        '/v1/market-insights/2026/monthly/3/reprocessor-exporter-figures'
      ])
    })
  })

  describe('an operator', () => {
    it('is refused the page, and asks the backend for nothing', async ({
      msw,
      server
    }) => {
      const asked = vi.fn()

      msw.use(
        http.get(figuresUrl, () => {
          asked()
          return HttpResponse.json(januaryToMarchFigures)
        })
      )

      const { statusCode, result } = await server.inject({
        method: 'GET',
        url: paths.regulators.marketInsightsUk,
        auth: operator
      })

      expect(statusCode).toBe(statusCodes.forbidden)
      expect(
        getByRole(documentOf(asHtml(result)), 'heading', {
          level: 1
        }).textContent.trim()
      ).toBe('You do not have permission')
      expect(asked).not.toHaveBeenCalled()
    })
  })

  describe('a session the backend granted no market data scope', () => {
    it('is refused the page, whatever role it carries', async ({ server }) => {
      const { statusCode } = await server.inject({
        method: 'GET',
        url: paths.regulators.marketInsightsUk,
        auth: regulatorWithoutMarketScope
      })

      expect(statusCode).toBe(statusCodes.forbidden)
    })
  })
})

describe('the UK reprocessor and exporter figures page with the flag off', () => {
  beforeAll(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-04-10T09:00:00.000Z'))
    config.set('featureFlags.regulatorAccess', true)
    config.set('featureFlags.marketInsights', false)
  })

  afterAll(() => {
    vi.useRealTimers()
    config.set('featureFlags.regulatorAccess', false)
  })

  it('still answers a regulator who types the URL', async ({ msw, server }) => {
    msw.use(servesJanuaryToMarch)

    const { statusCode, result } = await server.inject({
      method: 'GET',
      url: paths.regulators.marketInsightsUk,
      auth: regulator
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(
      getAllByRole(documentOf(asHtml(result)), 'table', {
        name: 'Reprocessor data for January 2026'
      })
    ).toHaveLength(1)
  })

  it('still refuses a session without the market data scope', async ({
    server
  }) => {
    const { statusCode } = await server.inject({
      method: 'GET',
      url: paths.regulators.marketInsightsUk,
      auth: regulatorWithoutMarketScope
    })

    expect(statusCode).toBe(statusCodes.forbidden)
  })
})
