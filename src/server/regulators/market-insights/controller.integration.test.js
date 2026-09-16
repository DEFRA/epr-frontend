import { config } from '#config/config.js'
import { OIDC_ENTRA_ID } from '#server/auth/plugins/entra-id.js'
import { SCOPES } from '#server/auth/scopes.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import {
  buildMockAuth,
  sessionIdentity
} from '#server/common/test-helpers/auth-helper.js'
import { asHtml } from '#server/common/test-helpers/dom.js'
import { IDENTITIES } from '#server/common/test-helpers/identity-helper.js'
import { paths } from '#server/paths.js'
import { beforeEach, it } from '#vite/fixtures/server.js'
import {
  getAllByRole,
  getByRole,
  getByText,
  queryByRole
} from '@testing-library/dom'
import { JSDOM } from 'jsdom'
import { http, HttpResponse } from 'msw'
import { afterAll, beforeAll, describe, expect, vi } from 'vitest'

/**
 * @import { ReprocessorExporterAggregate } from './helpers/fetch-reprocessor-exporter-figures.js'
 * @import { WasteBalanceAggregate } from './helpers/fetch-waste-balance.js'
 * @import { ExporterFigures, ReprocessorFigures } from './helpers/to-reprocessor-exporter-tables.js'
 * @import { PublishedFigures, PublishedMonth } from './helpers/to-waste-balance-table.js'
 */

const backendUrl = config.get('eprBackendUrl')
const wasteBalanceUrl = `${backendUrl}/v1/market-insights/:year/:cadence/:period/waste-balance`
const figuresUrl = `${backendUrl}/v1/market-insights/:year/:cadence/:period/reprocessor-exporter-figures`

const regulator = buildMockAuth({
  provider: OIDC_ENTRA_ID,
  profile: { id: 'entra-user-1', email: 'regulator@example.com' },
  backendToken: 'regulator-backend-token',
  ...sessionIdentity(IDENTITIES.regulator)
})

const operator = buildMockAuth()

const regulatorWithoutMarketScope = buildMockAuth({
  provider: OIDC_ENTRA_ID,
  profile: { id: 'entra-user-2', email: 'no.market@example.com' },
  role: IDENTITIES.regulator.role,
  scope: [SCOPES.organisationSearch]
})

/**
 * @param {number} netCredit
 * @returns {PublishedFigures}
 */
const figuresOf = (netCredit) => ({
  totalCredited: netCredit,
  eligibleForWasteBalance: netCredit,
  sentOnDeductions: 0,
  netCredit
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
    period: { reports: { expected: 9, submitted: 4 } }
  }
}

/**
 * @param {Partial<ReprocessorFigures>} figures
 * @returns {ReprocessorFigures}
 */
const reprocessorOf = (figures = {}) => ({
  tonnageReceived: 0,
  tonnageRecycled: 0,
  tonnageReceivedButNotRecycled: 0,
  tonnageSentOnTotal: 0,
  tonnageSentOnToReprocessor: 0,
  tonnageSentOnToExporter: 0,
  tonnageSentOnToOtherFacilities: 0,
  revisedTonnageIssued: 0,
  totalRevenue: 0,
  averagePricePerTonne: 0,
  ...figures
})

/**
 * @param {Partial<ExporterFigures>} figures
 * @returns {ExporterFigures}
 */
const exporterOf = (figures = {}) => ({
  tonnageReceived: 0,
  tonnageExported: 0,
  tonnageReceivedButNotExported: 0,
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
  ...figures
})

/**
 * A month in which plastic was reprocessed and aluminium exported, every
 * other served figure at zero. The page shows whatever materials are served,
 * so two are enough to see both tables laid out.
 * @param {{ plastic: Partial<ReprocessorFigures>, aluminium: Partial<ExporterFigures> }} figures
 * @returns {ReprocessorExporterAggregate['data']['months'][string]}
 */
const figuresMonthOf = ({ plastic, aluminium }) => ({
  figures: {
    plastic: { reprocessor: reprocessorOf(plastic), exporter: exporterOf() },
    aluminium: {
      reprocessor: reprocessorOf(),
      exporter: exporterOf(aluminium)
    }
  }
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
      '2026-01': figuresMonthOf({
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
      }),
      '2026-02': figuresMonthOf({ plastic: {}, aluminium: {} }),
      '2026-03': figuresMonthOf({ plastic: {}, aluminium: {} })
    }
  }
}

const servesJanuaryToMarch = [
  http.get(wasteBalanceUrl, () => HttpResponse.json(januaryToMarch)),
  http.get(figuresUrl, () => HttpResponse.json(januaryToMarchFigures))
]

/**
 * The regulator home page fetches its own list, and these tests are about the
 * link it offers rather than what that list holds.
 */
const anEmptyPageOfOrganisations = http.get(
  `${backendUrl}/v1/organisations`,
  () =>
    HttpResponse.json({
      items: [],
      page: 1,
      pageSize: 50,
      totalItems: 0,
      totalPages: 0
    })
)

/**
 * @param {string} html
 */
const documentOf = (html) => new JSDOM(html).window.document.body

/**
 * @param {ReturnType<typeof documentOf>} body
 * @returns {string[][]}
 */
const rowsOf = (body) =>
  Array.from(body.querySelectorAll('tbody tr')).map((row) =>
    Array.from(row.querySelectorAll('th, td')).map((cell) =>
      cell.textContent.trim()
    )
  )

/**
 * @param {ReturnType<typeof documentOf>} body
 * @returns {string[]}
 */
const headingsOf = (body) =>
  Array.from(body.querySelectorAll('thead th')).map((cell) =>
    cell.textContent.trim()
  )

describe('the market insights page', () => {
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
      msw.use(...servesJanuaryToMarch)
    })

    it('reads the waste balance laid out the way the publication is, months across and net credit in the cells', async ({
      server
    }) => {
      const { statusCode, result } = await server.inject({
        method: 'GET',
        url: paths.regulators.marketInsights,
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
        url: paths.regulators.marketInsights,
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
        url: paths.regulators.marketInsights,
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
      msw,
      server
    }) => {
      msw.use(
        http.get(wasteBalanceUrl, () => HttpResponse.json(januaryToMarch))
      )

      const { result } = await server.inject({
        method: 'GET',
        url: paths.regulators.marketInsights,
        auth: regulator
      })

      const heading = getByRole(documentOf(asHtml(result)), 'heading', {
        level: 1
      })

      expect(heading.nextElementSibling?.textContent.trim()).toBe(
        'This page is still being built. Some figures may be missing or wrong.'
      )
    })

    it('says how the figures are calculated, before the table', async ({
      server
    }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: paths.regulators.marketInsights,
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
      while (element !== null && element.matches('p, ul')) {
        wording.push(
          element.matches('ul')
            ? Array.from(element.querySelectorAll('li')).map((item) =>
                item.textContent.trim()
              )
            : element.textContent.trim()
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
        'The figures are live. They come from the summary logs held at the time shown above, not from a record of what was published. If an operator resubmits a summary log, earlier months change. The columns run from January of the reporting year to the last complete month, and the total adds the months together.'
      ])
    })

    it('asks for the reporting period through the last complete month', async ({
      msw,
      server
    }) => {
      /** @type {URL | undefined} */
      let captured

      msw.use(
        http.get(wasteBalanceUrl, ({ request }) => {
          captured = new URL(request.url)
          return HttpResponse.json(januaryToMarch)
        })
      )

      await server.inject({
        method: 'GET',
        url: paths.regulators.marketInsights,
        auth: regulator
      })

      expect(/** @type {URL} */ (captured).pathname).toBe(
        '/v1/market-insights/2026/monthly/3/waste-balance'
      )
    })

    it('asks for the reprocessor and exporter figures over the same period', async ({
      msw,
      server
    }) => {
      /** @type {URL | undefined} */
      let captured

      msw.use(
        http.get(figuresUrl, ({ request }) => {
          captured = new URL(request.url)
          return HttpResponse.json(januaryToMarchFigures)
        })
      )

      await server.inject({
        method: 'GET',
        url: paths.regulators.marketInsights,
        auth: regulator
      })

      expect(/** @type {URL} */ (captured).pathname).toBe(
        '/v1/market-insights/2026/monthly/3/reprocessor-exporter-figures'
      )
    })

    it('gives every month served a heading, and a region the keyboard can scroll sideways', async ({
      server
    }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: paths.regulators.marketInsights,
        auth: regulator
      })

      const body = documentOf(asHtml(result))

      expect(
        getAllByRole(body, 'heading', { level: 3 })
          .map((heading) => heading.textContent.trim())
          .filter((name) => name.endsWith('2026'))
      ).toStrictEqual(['January 2026', 'February 2026', 'March 2026'])

      // The tables are wider than the page, so they scroll sideways.
      expect(
        getByRole(body, 'region', { name: 'January 2026' }).getAttribute(
          'tabindex'
        )
      ).toBe('0')
    })

    it('reads a reprocessor table for a month, the figures laid out the way the publication is', async ({
      server
    }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: paths.regulators.marketInsights,
        auth: regulator
      })

      const body = documentOf(asHtml(result))

      const [januaryReprocessors] = getAllByRole(body, 'table', {
        name: 'Reprocessor data'
      })
      expect(headingsOf(januaryReprocessors)).toStrictEqual([
        'Material',
        'Tonnage received for recycling',
        'Tonnage recycled',
        'Tonnage received but not recycled',
        'Tonnage sent on, total',
        'Tonnage sent on to a reprocessor',
        'Tonnage sent on to an exporter',
        'Tonnage sent on to other facilities',
        'Tonnage of PRNs issued',
        'PRN revenue',
        'Average PRN price per tonne'
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
        ]
      ])
    })

    it('reads an exporter table for a month, the figures laid out the way the publication is', async ({
      server
    }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: paths.regulators.marketInsights,
        auth: regulator
      })

      const body = documentOf(asHtml(result))

      const [januaryExporters] = getAllByRole(body, 'table', {
        name: 'Exporter data'
      })
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
        'Tonnage of PERNs issued',
        'PERN revenue',
        'Average PERN price per tonne'
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
        ]
      ])
    })

    it('states when the reprocessor and exporter figures were taken, beside them', async ({
      server
    }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: paths.regulators.marketInsights,
        auth: regulator
      })

      // Read in UK time, an hour ahead of the served UTC moment in April.
      expect(
        getByText(
          documentOf(asHtml(result)),
          'Data taken at 10:30am on 10 April 2026'
        )
      ).not.toBeNull()
    })

    it('says the reprocessor and exporter figures are provisional, and how they are calculated, before their tables', async ({
      server
    }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: paths.regulators.marketInsights,
        auth: regulator
      })

      const body = documentOf(asHtml(result))
      const heading = getByRole(body, 'heading', {
        level: 2,
        name: 'Reprocessor and exporter figures'
      })

      // The wording sits between the section heading and the first month,
      // so a regulator reads it before the figures it explains.
      /** @type {string[]} */
      const wording = []
      let element = heading.nextElementSibling
      while (element !== null && element.matches('p, h3')) {
        wording.push(element.textContent.trim())
        element = element.nextElementSibling
      }

      expect(element?.querySelector('table')).not.toBeNull()
      expect(wording).toStrictEqual([
        'The tables show, for each month, the tonnage accredited reprocessors and exporters reported receiving, recycling or exporting, and sending on, by material. They also show the tonnage PRNs and PERNs were issued for, the revenue from those notes and the average price per tonne. The monthly market insights workbook uses these figures.',
        'Data taken at 10:30am on 10 April 2026',
        'Figures are provisional and based on submissions received to date. Some data is still expected and will be included in future updates.',
        'Reported PRN and PERN revenue submissions currently include some anomalies. They remain subject to correction by resubmission from operators.',
        'How the reprocessor and exporter figures are calculated',
        'The figures come from the monthly reports operators submit. Quarterly reports do not count. Where an operator has submitted a month more than once, only the latest submission counts.',
        'A report counts if its accreditation is approved or suspended. If the accreditation has since been cancelled, none of its reports count, in any month. The regulators’ workbooks do the same.',
        'The tonnage PRNs or PERNs were issued for is the tonnage issued less the tonnage self-issued. The average price per tonne is the total revenue divided by that tonnage. Both totals are added up across all operators before dividing. It is not an average of each operator’s own price. Where no tonnage was issued, the average is 0.',
        'Every material and both accreditation types appear for every month. A row shows 0 where no operator reported activity.',
        'The figures are live. They come from the monthly reports held at the time shown above, not from a record of what was published. If an operator resubmits a month, its figures change.',
        'January 2026'
      ])
    })

    it('reaches the page from the regulator area', async ({ msw, server }) => {
      msw.use(anEmptyPageOfOrganisations)

      const { result } = await server.inject({
        method: 'GET',
        url: paths.regulators.home,
        auth: regulator
      })

      expect(
        getByRole(documentOf(asHtml(result)), 'link', {
          name: 'Market insights'
        }).getAttribute('href')
      ).toBe(paths.regulators.marketInsights)
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
        url: paths.regulators.marketInsights,
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
        url: paths.regulators.marketInsights,
        auth: regulatorWithoutMarketScope
      })

      expect(statusCode).toBe(statusCodes.forbidden)
    })

    it('is not offered the page from the regulator area', async ({
      msw,
      server
    }) => {
      msw.use(anEmptyPageOfOrganisations)

      const { result } = await server.inject({
        method: 'GET',
        url: paths.regulators.home,
        auth: regulatorWithoutMarketScope
      })

      expect(
        queryByRole(documentOf(asHtml(result)), 'link', {
          name: 'Market insights'
        })
      ).toBeNull()
    })
  })
})

describe('the market insights page with the flag off', () => {
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
    msw.use(...servesJanuaryToMarch)

    const { statusCode, result } = await server.inject({
      method: 'GET',
      url: paths.regulators.marketInsights,
      auth: regulator
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(
      getByRole(documentOf(asHtml(result)), 'heading', {
        level: 2,
        name: 'How the figures are calculated'
      })
    ).toBeDefined()
  })

  it('still refuses a session without the market data scope', async ({
    server
  }) => {
    const { statusCode } = await server.inject({
      method: 'GET',
      url: paths.regulators.marketInsights,
      auth: regulatorWithoutMarketScope
    })

    expect(statusCode).toBe(statusCodes.forbidden)
  })

  it('is not offered from the regulator area', async ({ msw, server }) => {
    msw.use(anEmptyPageOfOrganisations)

    const { result } = await server.inject({
      method: 'GET',
      url: paths.regulators.home,
      auth: regulator
    })

    expect(
      queryByRole(documentOf(asHtml(result)), 'link', {
        name: 'Market insights'
      })
    ).toBeNull()
  })
})
