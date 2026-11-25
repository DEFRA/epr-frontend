import { config } from '#config/config.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import {
  asHtml,
  documentOf,
  headingsOf,
  rowsOf
} from '#server/common/test-helpers/dom.js'
import {
  LANDING_HEADING,
  NOTICE,
  exporterOf,
  operator,
  regulator,
  regulatorWithoutMarketScope,
  reprocessorOf,
  totalsOf
} from '#server/common/test-helpers/market-insights-fixtures.js'
import { toYear } from '#server/common/helpers/year.js'
import { paths } from '#server/paths.js'
import { beforeEach, it } from '#vite/fixtures/server.js'
import {
  getAllByRole,
  getByRole,
  getByText,
  queryByText
} from '@testing-library/dom'
import { http, HttpResponse } from 'msw'
import { afterAll, beforeAll, describe, expect, vi } from 'vitest'

import { yearPath } from '../helpers/year-path.js'

const pageUrl = yearPath(paths.regulators.marketInsightsUk, toYear(2026))

/**
 * @import { ReprocessorExporterAggregate } from '../helpers/fetch-reprocessor-exporter-figures.js'
 * @import { ExporterFigures, ReprocessorFigures } from '../helpers/to-reprocessor-exporter-tables.js'
 */

const backendUrl = config.get('eprBackendUrl')
const figuresUrl = `${backendUrl}/v1/market-insights/:year/:cadence/:period/reprocessor-exporter-figures`

/** The paragraph a table holding a marked figure is described by. */
const MARKED =
  'Figures are marked [c] to show that the data came from only 1 or 2 operators. Rows with no accredited operators and nothing in them are not marked [c].'

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

    it('has no page for a year with no finished month', async ({ server }) => {
      vi.setSystemTime(new Date('2027-01-15T09:00:00.000Z'))

      const { statusCode } = await server.inject({
        method: 'GET',
        url: yearPath(paths.regulators.marketInsightsUk, toYear(2027)),
        auth: regulator
      })

      vi.setSystemTime(new Date('2026-04-10T09:00:00.000Z'))

      expect(statusCode).toBe(statusCodes.notFound)
    })

    it('gives every month served a region the keyboard can scroll sideways', async ({
      server
    }) => {
      const { statusCode, result } = await server.inject({
        method: 'GET',
        url: pageUrl,
        auth: regulator
      })

      expect(statusCode).toBe(statusCodes.ok)

      const body = documentOf(asHtml(result))

      expect(
        getAllByRole(getByRole(body, 'main'), 'region').map((region) =>
          region.getAttribute('aria-label')
        )
      ).toStrictEqual(['January 2026', 'February 2026', 'March 2026'])

      // The tables are wider than the page, so they scroll sideways.
      expect(
        getByRole(body, 'region', { name: 'January 2026' }).getAttribute(
          'tabindex'
        )
      ).toBe('0')
    })

    it('says beneath each month how many of the monthly reports it was owed have been submitted, after its tables', async ({
      server
    }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: pageUrl,
        auth: regulator
      })

      expect(
        getAllByRole(
          getByRole(documentOf(asHtml(result)), 'main'),
          'region'
        ).map((region) => (region.nextElementSibling?.textContent ?? '').trim())
      ).toStrictEqual([
        'Monthly reports submitted: 1 of 2',
        'Monthly reports submitted: 2 of 2',
        'Monthly reports submitted: 0 of 3'
      ])
    })

    it('reads a reprocessor table for a month, the figures laid out the way the publication is', async ({
      server
    }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: pageUrl,
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
        url: pageUrl,
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

    it('marks each figure few operators were accredited for as confidential, however many of them reported, and describes each table holding one by the paragraph explaining the marks', async ({
      msw,
      server
    }) => {
      msw.use(
        http.get(figuresUrl, () =>
          HttpResponse.json({
            ...januaryToMarchFigures,
            data: {
              months: {
                ...januaryToMarchFigures.data.months,
                '2026-02': {
                  reports: { expected: 5, submitted: 5 },
                  figures: {
                    plastic: {
                      reprocessor: reprocessorOf(
                        {
                          tonnageReceived: 500,
                          revisedTonnageIssued: 10,
                          totalRevenue: 1200,
                          averagePricePerTonne: 120
                        },
                        {
                          operatorCount: 2,
                          submittingOperatorCount: 2,
                          contributingOperatorCounts: {
                            tonnageReceived: 2,
                            revisedTonnageIssued: 2,
                            totalRevenue: 2,
                            averagePricePerTonne: 2
                          }
                        }
                      ),
                      exporter: exporterOf()
                    },
                    aluminium: {
                      reprocessor: reprocessorOf(),
                      exporter: exporterOf(
                        { tonnageReceived: 40 },
                        {
                          operatorCount: 5,
                          submittingOperatorCount: 5,
                          contributingOperatorCounts: { tonnageReceived: 5 }
                        }
                      )
                    }
                  },
                  totals: totalsOf({
                    reprocessor: {
                      tonnageReceived: 500,
                      revisedTonnageIssued: 10,
                      totalRevenue: 1200
                    },
                    reprocessorCounts: {
                      operatorCount: 3,
                      submittingOperatorCount: 2,
                      contributingOperatorCounts: {
                        tonnageReceived: 2,
                        revisedTonnageIssued: 2,
                        totalRevenue: 2
                      }
                    }
                  })
                }
              }
            }
          })
        )
      )

      const { result } = await server.inject({
        method: 'GET',
        url: pageUrl,
        auth: regulator
      })

      const body = documentOf(asHtml(result))

      // The paragraph explaining the marks is the table's description, so a
      // screen reader announces what [c] means as it reaches the table.
      const februaryReprocessors = getByRole(body, 'table', {
        name: 'Reprocessor data for February 2026',
        description: MARKED
      })

      expect(rowsOf(februaryReprocessors)).toStrictEqual([
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
          '500.00 [c]',
          '0.00 [c]',
          '0.00 [c]',
          '0.00 [c]',
          '0.00 [c]',
          '0.00 [c]',
          '0.00 [c]',
          '10.00 [c]',
          '£1,200.00 [c]',
          '£120.00 [c]'
        ],
        [
          'Grand Total',
          '500.00',
          '0.00',
          '0.00',
          '0.00',
          '0.00',
          '0.00',
          '0.00',
          '10.00',
          '£1,200.00',
          '- No average price is calculated'
        ]
      ])

      // A table with no marked figure carries no description.
      expect(
        getByRole(body, 'table', {
          name: 'Exporter data for February 2026'
        }).getAttribute('aria-describedby')
      ).toBeNull()
      expect(
        getAllByRole(body, 'table', {
          description: MARKED
        })
      ).toHaveLength(1)
      // The [c] shorthand is explained only where the design explains it.
      expect(queryByText(body, /Some shorthand/)).toBeNull()
    })

    it('marks a row no operator was accredited for that still holds data, and describes its table by the paragraph explaining the marks', async ({
      msw,
      server
    }) => {
      msw.use(
        http.get(figuresUrl, () =>
          HttpResponse.json({
            ...januaryToMarchFigures,
            data: {
              months: {
                ...januaryToMarchFigures.data.months,
                '2026-02': {
                  reports: { expected: 5, submitted: 5 },
                  figures: {
                    plastic: {
                      reprocessor: reprocessorOf(
                        { tonnageReceived: 500 },
                        { operatorCount: 0, submittingOperatorCount: 0 }
                      ),
                      exporter: exporterOf()
                    },
                    aluminium: {
                      reprocessor: reprocessorOf(),
                      exporter: exporterOf()
                    }
                  },
                  totals: totalsOf()
                }
              }
            }
          })
        )
      )

      const { result } = await server.inject({
        method: 'GET',
        url: pageUrl,
        auth: regulator
      })

      const body = documentOf(asHtml(result))

      const februaryReprocessors = getByRole(body, 'table', {
        name: 'Reprocessor data for February 2026',
        description: MARKED
      })

      expect(rowsOf(februaryReprocessors)).toStrictEqual([
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
          '500.00 [c]',
          '0.00 [c]',
          '0.00 [c]',
          '0.00 [c]',
          '0.00 [c]',
          '0.00 [c]',
          '0.00 [c]',
          '0.00 [c]',
          '£0.00 [c]',
          '£0.00 [c]'
        ],
        [
          'Grand Total',
          '0.00',
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

    it('states the period the figures cover and when they were taken', async ({
      server
    }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: pageUrl,
        auth: regulator
      })

      const body = documentOf(asHtml(result))

      expect(getByText(body, 'January to March 2026')).not.toBeNull()
      // The moment is served in UTC and read in UK time, which is an hour ahead
      // in April, so a page showing 9:30am would be showing the wrong zone.
      expect(
        getByText(
          body,
          'Data aggregated at 10:30am, 10 April 2026. The figures do not come from a record of what has been published and may change if an operator resubmits a month.'
        )
      ).not.toBeNull()
    })

    it('says when the figures were aggregated in place of saying the page is still being built, above the description', async ({
      server
    }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: pageUrl,
        auth: regulator
      })

      const body = documentOf(asHtml(result))
      const heading = getByRole(body, 'heading', { level: 1 })

      expect(heading.nextElementSibling?.textContent.trim()).toMatch(
        /^Data aggregated at /
      )
      expect(body.textContent).not.toContain(NOTICE)
    })

    it('leads back to the page listing the sets of figures', async ({
      server
    }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: pageUrl,
        auth: regulator
      })

      const trail = getByRole(documentOf(asHtml(result)), 'navigation', {
        name: 'Breadcrumb'
      })

      expect(
        getAllByRole(trail, 'listitem').map((crumb) =>
          (crumb.textContent ?? '').trim()
        )
      ).toStrictEqual([LANDING_HEADING, 'Reprocessor and exporter figures: UK'])
      expect(
        getByRole(trail, 'link', { name: LANDING_HEADING }).getAttribute('href')
      ).toBe('/regulators/market-insights/2026')
    })

    it('says what the figures are made of, and how they are calculated, after the tables', async ({
      server
    }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: pageUrl,
        auth: regulator
      })

      const body = documentOf(asHtml(result))

      // The wording runs from the last month's count of reports to the end of
      // the page, so a regulator reads the figures before what explains them.
      const regions = getAllByRole(getByRole(body, 'main'), 'region')
      /** @type {string[]} */
      const wording = []
      let element =
        regions.at(-1)?.nextElementSibling?.nextElementSibling ?? null
      while (element !== null) {
        wording.push((element.textContent ?? '').trim())
        element = element.nextElementSibling
      }

      expect(wording).toStrictEqual([
        'For each month, the tables show what accredited reprocessors and exporters reported by material (tonnage received, recycled or exported, or sent on). They also show the tonnage PRNs and PERNs were issued for, the revenue from those notes and the average price for each tonne. These figures are included in the monthly published (redacted) data workbook (XLSX).',
        'The figures shown are only as good as the reports submitted by the operators. Operators that have not submitted a month add nothing to the figures. The most recent months are the least complete because reports are still arriving. Each month shows how many of the monthly reports have been received.',
        'How the tables are compiled',
        'The figures come from the monthly reports that operators submit, not from the summary logs that the UK waste balance uses. Where an operator has submitted a month more than once, only the latest submission counts. Quarterly reports do not count.',
        'A report counts only if the accreditation it was submitted for is currently approved or suspended. Where an accreditation has been cancelled, it counts neither as a submission nor as a non-submission for the relevant period. Any tonnage associated with a cancelled accreditation will remain in the waste balance so as not to distort the overall picture of packaging waste reprocessing and export.',
        'Operators report notes issued ‘free of charge’ separately, and that tonnage is not included. Revenue and tonnage are each added up across all operators, then total revenue is divided by total tonnage to give the average price of each tonne. Where no tonnage was issued, the average is 0.',
        'Revenue is what operators reported as received, or are expecting to receive, for their notes (excluding VAT).',
        'Each figure is rounded to two decimal places as it is added up. The total can differ by a few pence from the same figures added first and rounded once.',
        'Each table ends with a Grand Total row, which adds up the figures for every material. No average price is calculated for it, so that cell shows a dash (-).',
        'Each month shows a reprocessor table and an exporter table, with every material appearing in both. A 0.00 figure displays where there’s no reported operator activity, where operators have reported, but left a figure out, and where a month has not been submitted.',
        'An operator counts as accredited for a figure if, on any day of the month, it was accredited to reprocess that material (reprocessor figures) or to export it (exporter figures). Suspended operators count, but operators whose accreditations were cancelled for the whole month do not.',
        'Accredited operators count even if they have not submitted their reports or their reports add nothing to the figure.',
        'A Grand Total is calculated for all the materials in a table column, operators accredited for more than one material still only count once. Also, an operator is a business, so only counts once regardless of however many sites it has.',
        'Figures marked [c]',
        'Figures are marked [c] to show that the data came from only 1 or 2 operators. Rows with no accredited operators and nothing in them are not marked [c].'
      ])
      expect(
        getByRole(body, 'link', {
          name: 'published (redacted) data workbook (XLSX)'
        }).getAttribute('href')
      ).toBe('/regulators/market-insights/2026/workbook.xlsx')
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
        url: pageUrl,
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
        url: pageUrl,
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
        url: pageUrl,
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
      url: pageUrl,
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
      url: pageUrl,
      auth: regulatorWithoutMarketScope
    })

    expect(statusCode).toBe(statusCodes.forbidden)
  })
})
