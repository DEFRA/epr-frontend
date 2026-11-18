import { config } from '#config/config.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import {
  asHtml,
  documentOf,
  headingsOf,
  rowsOf
} from '#server/common/test-helpers/dom.js'
import {
  CONFIDENTIAL_KEY,
  LANDING_HEADING,
  NOTICE,
  operator,
  regulator,
  regulatorWithoutMarketScope
} from '#server/common/test-helpers/market-insights-fixtures.js'
import { paths } from '#server/paths.js'
import { beforeEach, it } from '#vite/fixtures/server.js'
import { getAllByRole, getByRole, getByText } from '@testing-library/dom'
import { http, HttpResponse } from 'msw'
import { afterAll, beforeAll, describe, expect, vi } from 'vitest'

/**
 * @import { WasteBalanceAggregate } from '../helpers/fetch-waste-balance.js'
 * @import { PublishedFigures, PublishedMonth } from '../helpers/to-waste-balance-table.js'
 * @import { OperatorCounts } from '../helpers/few-operators.js'
 */

const backendUrl = config.get('eprBackendUrl')
const wasteBalanceUrl = `${backendUrl}/v1/market-insights/:year/:cadence/:period/waste-balance`

/**
 * @param {number} netCredit
 * @param {Partial<OperatorCounts>} [counts]
 * @returns {PublishedFigures}
 */
const figuresOf = (netCredit, counts = {}) => ({
  totalCredited: netCredit,
  eligibleForWasteBalance: netCredit,
  sentOnDeductions: 0,
  netCredit,
  operatorCount: 3,
  submittingOperatorCount: 0,
  ...counts
})

/**
 * A month in which glass was reprocessed and aluminium exported, every other
 * served figure at zero. The page shows whatever materials are served, so two
 * are enough to see the rows laid out.
 * @param {{ glass: number, aluminium: number }} netCredits
 * @param {PublishedMonth['reports']} reports
 * @returns {PublishedMonth}
 */
const monthOf = ({ glass, aluminium }, reports) => ({
  reports,
  figures: {
    glass_re_melt: { reprocessor: figuresOf(glass), exporter: figuresOf(0) },
    aluminium: { reprocessor: figuresOf(0), exporter: figuresOf(aluminium) }
  }
})

/** @type {WasteBalanceAggregate} */
const januaryToMarch = {
  meta: { generatedAt: '2026-04-10T09:00:00.000Z' },
  data: {
    months: {
      '2026-01': monthOf(
        { glass: 90, aluminium: 0 },
        { expected: 2, submitted: 1 }
      ),
      '2026-02': monthOf(
        { glass: 42.5, aluminium: 8 },
        { expected: 2, submitted: 2 }
      ),
      '2026-03': monthOf(
        { glass: 0, aluminium: 0 },
        { expected: 3, submitted: 0 }
      )
    },
    period: {
      reports: { expected: 9, submitted: 4 },
      operatorCounts: {
        glass_re_melt: {
          reprocessor: { operatorCount: 6, submittingOperatorCount: 4 },
          exporter: { operatorCount: 6, submittingOperatorCount: 4 }
        },
        aluminium: {
          reprocessor: { operatorCount: 6, submittingOperatorCount: 4 },
          exporter: { operatorCount: 6, submittingOperatorCount: 4 }
        }
      },
      figures: {
        glass_re_melt: {
          reprocessor: { netCredit: 132.5 },
          exporter: { netCredit: 0 }
        },
        aluminium: {
          reprocessor: { netCredit: 0 },
          exporter: { netCredit: 8 }
        }
      }
    }
  }
}

const servesJanuaryToMarch = http.get(wasteBalanceUrl, () =>
  HttpResponse.json(januaryToMarch)
)

describe('the UK waste balance page', () => {
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

    it('reads the waste balance laid out the way the publication is, months across and net credit in the cells', async ({
      server
    }) => {
      const { statusCode, result } = await server.inject({
        method: 'GET',
        url: paths.regulators.marketInsightsWasteBalance,
        auth: regulator
      })

      expect(statusCode).toBe(statusCodes.ok)

      const table = getByRole(documentOf(asHtml(result)), 'table', {
        name: 'Waste balance'
      })

      expect(headingsOf(table)).toStrictEqual([
        'Material',
        'Accreditation type',
        'January',
        'February',
        'March',
        'Total'
      ])
      expect(rowsOf(table)).toStrictEqual([
        ['Aluminium', 'Exporter', '0.00', '8.00', '0.00', '8.00'],
        ['Aluminium', 'Reprocessor', '0.00', '0.00', '0.00', '0.00'],
        ['Glass remelt', 'Exporter', '0.00', '0.00', '0.00', '0.00'],
        ['Glass remelt', 'Reprocessor', '90.00', '42.50', '0.00', '132.50'],
        ['Monthly reports submitted', '1 of 2', '2 of 2', '0 of 3', '4 of 9']
      ])
    })

    it('heads the reports row across the two columns that name every other row, so its counts sit under the months', async ({
      server
    }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: paths.regulators.marketInsightsWasteBalance,
        auth: regulator
      })

      expect(
        getByRole(documentOf(asHtml(result)), 'rowheader', {
          name: 'Monthly reports submitted'
        }).getAttribute('colspan')
      ).toBe('2')
    })

    it('states the period the figures cover and when they were taken', async ({
      server
    }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: paths.regulators.marketInsightsWasteBalance,
        auth: regulator
      })

      const body = documentOf(asHtml(result))

      expect(getByText(body, 'January to March 2026')).not.toBeNull()
      // The moment is served in UTC and read in UK time, which is an hour ahead
      // in April, so a page showing 9am would be showing the wrong zone.
      expect(
        getByText(
          body,
          'Data aggregated at 10:00am, 10 April 2026. The figures do not come from a record of what has been published and may change if an operator resubmits a summary log.'
        )
      ).not.toBeNull()
    })

    it('says when the figures were aggregated in place of saying the page is still being built, above the description', async ({
      server
    }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: paths.regulators.marketInsightsWasteBalance,
        auth: regulator
      })

      const body = documentOf(asHtml(result))
      const inset = getByRole(body, 'heading', { level: 1 }).nextElementSibling

      expect(inset?.textContent.trim()).toMatch(/^Data aggregated at /)
      expect(inset?.nextElementSibling?.textContent.trim()).toBe(
        'The table shows the tonnage included in accredited operator or exporter waste balances by material and accreditation type, less any tonnage that has been sent on. These figures are included in the monthly published (redacted) data workbook (XLSX).'
      )
      expect(body.textContent).not.toContain(NOTICE)
    })

    it('leads back to the page listing the sets of figures', async ({
      server
    }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: paths.regulators.marketInsightsWasteBalance,
        auth: regulator
      })

      const trail = getByRole(documentOf(asHtml(result)), 'navigation', {
        name: 'Breadcrumb'
      })

      expect(
        getAllByRole(trail, 'listitem').map((crumb) =>
          (crumb.textContent ?? '').trim()
        )
      ).toStrictEqual([LANDING_HEADING, 'UK waste balance'])
      expect(
        getByRole(trail, 'link', { name: LANDING_HEADING }).getAttribute('href')
      ).toBe(paths.regulators.marketInsights)
    })

    it('marks each month and row total few operators were accredited for as confidential, however many of them reported', async ({
      msw,
      server
    }) => {
      msw.use(
        http.get(wasteBalanceUrl, () =>
          HttpResponse.json({
            ...januaryToMarch,
            data: {
              ...januaryToMarch.data,
              period: {
                ...januaryToMarch.data.period,
                operatorCounts: {
                  ...januaryToMarch.data.period.operatorCounts,
                  aluminium: {
                    reprocessor: {
                      operatorCount: 0,
                      submittingOperatorCount: 0
                    },
                    exporter: { operatorCount: 2, submittingOperatorCount: 2 }
                  }
                }
              },
              months: {
                ...januaryToMarch.data.months,
                '2026-02': {
                  reports: { expected: 2, submitted: 2 },
                  figures: {
                    glass_re_melt: {
                      reprocessor: figuresOf(42.5, {
                        operatorCount: 2,
                        submittingOperatorCount: 2
                      }),
                      exporter: figuresOf(0, {
                        operatorCount: 3,
                        submittingOperatorCount: 1
                      })
                    },
                    aluminium: {
                      reprocessor: figuresOf(0),
                      exporter: figuresOf(8, {
                        operatorCount: 7,
                        submittingOperatorCount: 5
                      })
                    }
                  }
                }
              }
            }
          })
        )
      )

      const { result } = await server.inject({
        method: 'GET',
        url: paths.regulators.marketInsightsWasteBalance,
        auth: regulator
      })

      // The key is the table's description, so a screen reader announces
      // what the shorthand means as it reaches the table.
      const table = getByRole(documentOf(asHtml(result)), 'table', {
        name: 'Waste balance',
        description: CONFIDENTIAL_KEY
      })

      // A row total that includes a marked month, but is not marked itself,
      // has the published total beside it, which leaves the marked month out.
      expect(headingsOf(table)).toStrictEqual([
        'Material',
        'Accreditation type',
        'January',
        'February',
        'March',
        'Total',
        'Published total, without the months marked [c]'
      ])
      expect(rowsOf(table)).toStrictEqual([
        ['Aluminium', 'Exporter', '0.00', '8.00', '0.00', '8.00 [c]', ''],
        ['Aluminium', 'Reprocessor', '0.00', '0.00', '0.00', '0.00', ''],
        ['Glass remelt', 'Exporter', '0.00', '0.00', '0.00', '0.00', ''],
        [
          'Glass remelt',
          'Reprocessor',
          '90.00',
          '42.50 [c]',
          '0.00',
          '132.50',
          '90.00'
        ],
        [
          'Monthly reports submitted',
          '1 of 2',
          '2 of 2',
          '0 of 3',
          '4 of 9',
          ''
        ]
      ])
    })

    it('marks a month no operator was accredited for that still holds a net credit, and describes the table by the key', async ({
      msw,
      server
    }) => {
      msw.use(
        http.get(wasteBalanceUrl, () =>
          HttpResponse.json({
            ...januaryToMarch,
            data: {
              ...januaryToMarch.data,
              period: {
                ...januaryToMarch.data.period,
                operatorCounts: {
                  ...januaryToMarch.data.period.operatorCounts,
                  aluminium: {
                    reprocessor: {
                      operatorCount: 0,
                      submittingOperatorCount: 0
                    },
                    exporter: { operatorCount: 3, submittingOperatorCount: 0 }
                  }
                },
                figures: {
                  ...januaryToMarch.data.period.figures,
                  glass_re_melt: {
                    ...januaryToMarch.data.period.figures.glass_re_melt,
                    reprocessor: { netCredit: 90 }
                  },
                  aluminium: {
                    reprocessor: { netCredit: 90 },
                    exporter: { netCredit: 0 }
                  }
                }
              },
              months: {
                ...januaryToMarch.data.months,
                '2026-02': {
                  reports: { expected: 2, submitted: 2 },
                  figures: {
                    glass_re_melt: {
                      reprocessor: figuresOf(0),
                      exporter: figuresOf(0)
                    },
                    aluminium: {
                      reprocessor: figuresOf(90, {
                        operatorCount: 0,
                        submittingOperatorCount: 0
                      }),
                      exporter: figuresOf(0)
                    }
                  }
                }
              }
            }
          })
        )
      )

      const { result } = await server.inject({
        method: 'GET',
        url: paths.regulators.marketInsightsWasteBalance,
        auth: regulator
      })

      const table = getByRole(documentOf(asHtml(result)), 'table', {
        name: 'Waste balance',
        description: CONFIDENTIAL_KEY
      })

      expect(rowsOf(table)).toStrictEqual([
        ['Aluminium', 'Exporter', '0.00', '0.00', '0.00', '0.00'],
        ['Aluminium', 'Reprocessor', '0.00', '90.00 [c]', '0.00', '90.00 [c]'],
        ['Glass remelt', 'Exporter', '0.00', '0.00', '0.00', '0.00'],
        ['Glass remelt', 'Reprocessor', '90.00', '0.00', '0.00', '90.00'],
        ['Monthly reports submitted', '1 of 2', '2 of 2', '0 of 3', '4 of 9']
      ])
    })

    it('says how the figures are calculated, before the table', async ({
      server
    }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: paths.regulators.marketInsightsWasteBalance,
        auth: regulator
      })

      const body = documentOf(asHtml(result))
      const heading = getByRole(body, 'heading', {
        level: 2,
        name: 'How the table is compiled'
      })

      // The wording sits between its heading and the table, so a regulator
      // reads it before the figures it explains.
      /** @type {(string | string[])[]} */
      const wording = []
      let element = heading.nextElementSibling
      while (element !== null && element.matches('p, ul, h2')) {
        wording.push(
          element.matches('ul')
            ? Array.from(element.querySelectorAll('li')).map((item) =>
                (item.textContent ?? '').trim()
              )
            : (element.textContent ?? '').trim()
        )
        element = element.nextElementSibling
      }

      expect(element?.querySelector('table')).not.toBeNull()
      expect(wording).toStrictEqual([
        'The figures come from the most recent summary logs submitted for each accreditation, they do not come from monthly reports. To show how complete the data is, the last row reveals how many operators submitted a monthly report against how many reports were due.',
        'The same rules apply to counted loads as apply to the operator’s own waste balance. An accreditation must be valid on the date that the load is counted. A load counts for the month that:',
        [
          'the reprocessor received it',
          'a recycled product left the reprocessing site',
          'an overseas reprocessor received the exported waste'
        ],
        'For reprocessors accredited on the tonnage they receive, any tonnage sent on is taken off the figure in the month that the load leaves the site. It’s taken off even if the accreditation was not valid on the date it left. The figures include tonnage for PRNs and PERNs the operator has issued from its waste balance and that the operator has already issued notes for.',
        'The columns run from January in the reporting year to the last complete month and the totals add the monthly data together.',
        'An operator counts as accredited for a figure if, on any day of the month, it was accredited to reprocess that material (reprocessor figures) or to export it (exporter figures). Suspended operators count, but operators whose accreditations were cancelled for the whole month do not. Accredited operators count towards the number of operators, even if none of their tonnage is included in a figure.',
        'Row totals are counted across each month, so operators accredited across more than one month still only count once towards the number of operators. Also, an operator is a business, so only counts once regardless of however many sites it has.',
        'Figures marked ‘c’',
        'Figures are marked ‘c’ to show that the data came from only 1 or 2 operators. Figures are also marked ‘c’ when no operators were accredited for it, but another figure in the same row holds data (for example, a late report from an operator cancelled for the whole month). Rows with no accredited operators and nothing in them are not marked ‘c’.'
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
          return HttpResponse.json(januaryToMarch)
        })
      )

      await server.inject({
        method: 'GET',
        url: paths.regulators.marketInsightsWasteBalance,
        auth: regulator
      })

      expect(asked.map((url) => url.pathname)).toStrictEqual([
        '/v1/market-insights/2026/monthly/3/waste-balance'
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
        http.get(wasteBalanceUrl, () => {
          asked()
          return HttpResponse.json(januaryToMarch)
        })
      )

      const { statusCode, result } = await server.inject({
        method: 'GET',
        url: paths.regulators.marketInsightsWasteBalance,
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
        url: paths.regulators.marketInsightsWasteBalance,
        auth: regulatorWithoutMarketScope
      })

      expect(statusCode).toBe(statusCodes.forbidden)
    })
  })
})

describe('the UK waste balance page with the flag off', () => {
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
      url: paths.regulators.marketInsightsWasteBalance,
      auth: regulator
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(
      getByRole(documentOf(asHtml(result)), 'table', { name: 'Waste balance' })
    ).toBeDefined()
  })

  it('still refuses a session without the market data scope', async ({
    server
  }) => {
    const { statusCode } = await server.inject({
      method: 'GET',
      url: paths.regulators.marketInsightsWasteBalance,
      auth: regulatorWithoutMarketScope
    })

    expect(statusCode).toBe(statusCodes.forbidden)
  })
})
