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
  operatorCount: 0,
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
        getByText(body, 'Data taken at 10:00am on 10 April 2026')
      ).not.toBeNull()
    })

    it('says the page is still being built, above the description', async ({
      server
    }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: paths.regulators.marketInsightsWasteBalance,
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
      ).toStrictEqual(['Market insights', 'UK waste balance'])
      expect(
        getByRole(trail, 'link', { name: 'Market insights' }).getAttribute(
          'href'
        )
      ).toBe(paths.regulators.marketInsights)
    })

    it('marks each month and row total few operators contributed to as confidential', async ({
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
                    exporter: { operatorCount: 4, submittingOperatorCount: 1 }
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
                        operatorCount: 3,
                        submittingOperatorCount: 2
                      }),
                      exporter: figuresOf(0, {
                        operatorCount: 3,
                        submittingOperatorCount: 0
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
        description:
          'Some shorthand is used in this table, [c] = confidential. This figure could reveal an individual operator’s own figures, because one or two operators could have contributed to it, or one or two did.'
      })

      expect(rowsOf(table)).toStrictEqual([
        ['Aluminium', 'Exporter', '0.00', '8.00', '0.00', '8.00 [c]'],
        ['Aluminium', 'Reprocessor', '0.00', '0.00', '0.00', '0.00'],
        ['Glass remelt', 'Exporter', '0.00', '0.00', '0.00', '0.00'],
        ['Glass remelt', 'Reprocessor', '90.00', '42.50 [c]', '0.00', '132.50'],
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
        name: 'How the figures are calculated'
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
        'The figures come from the latest summary log each accreditation has submitted. The last row shows how many monthly reports were due for each month and how many operators submitted. This is a guide to how complete the figures are. The figures do not come from the monthly reports.',
        'A load counts under the same rules as the operator’s own waste balance. The accreditation must have been valid on the date the load counts.',
        'A load counts in the month:',
        [
          'a reprocessor received it',
          'a recycled product left the reprocessing site',
          'an overseas reprocessor received the exported waste'
        ],
        'Tonnage a reprocessor sends on comes off the figure in the month the load left its site. This applies only to a reprocessor accredited on the tonnage it receives. It comes off even if the accreditation was not valid on that date. The figures do not deduct PRNs and PERNs the operator issues from its waste balance. They include tonnage the operator has already issued notes for.',
        'The figures are live. They come from the summary logs held at the time shown above, not from a record of what was published. If an operator resubmits a summary log, earlier months change. The columns run from January of the reporting year to the last complete month, and the total adds the months together.',
        'Figures from few operators',
        'A figure is marked [c] when one or two operators could have contributed to it, or when one or two operators did. A figure no operator could have contributed to is not marked.',
        'The operators who could have contributed to a figure are every operator owed a monthly report for that month, whether or not the figure includes any of its tonnage, and any other operator with tonnage in the figure. A suspended operator counts. An operator whose accreditation stood cancelled for the whole month does not, unless it sent tonnage on that month. An operator the figures leave out does not count either.',
        'The operators with tonnage in a figure are those with a load that adds to it, or a load sent on that comes off it. A load the waste balance ignores, such as one dated while the accreditation was suspended, does not count.',
        'A row’s total is counted across all its months, so an operator that could have contributed in more than one month counts once.',
        'An operator is a business. It counts once however many sites it has.'
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
