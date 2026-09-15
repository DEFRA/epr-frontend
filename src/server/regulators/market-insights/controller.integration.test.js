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
import { it } from '#vite/fixtures/server.js'
import { getByRole, getByText, queryByRole } from '@testing-library/dom'
import { JSDOM } from 'jsdom'
import { http, HttpResponse } from 'msw'
import { afterAll, beforeAll, describe, expect, vi } from 'vitest'

/**
 * @import { WasteBalanceAggregate } from './helpers/fetch-waste-balance.js'
 * @import { PublishedFigures, PublishedMonth } from './helpers/to-waste-balance-table.js'
 */

const backendUrl = config.get('eprBackendUrl')
const wasteBalanceUrl = `${backendUrl}/v1/market-insights/:year/:cadence/:period/waste-balance`

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
    it('reads the waste balance laid out the way the publication is, months across and net credit in the cells', async ({
      msw,
      server
    }) => {
      msw.use(
        http.get(wasteBalanceUrl, () => HttpResponse.json(januaryToMarch))
      )

      const { statusCode, result } = await server.inject({
        method: 'GET',
        url: paths.regulators.marketInsights,
        auth: regulator
      })

      expect(statusCode).toBe(statusCodes.ok)

      const body = documentOf(asHtml(result))

      expect(headingsOf(body)).toStrictEqual([
        'Material',
        'Accreditation type',
        'January',
        'February',
        'March',
        'Total'
      ])
      expect(rowsOf(body)).toStrictEqual([
        ['Aluminium', 'Exporter', '0.00', '8.00', '0.00', '8.00'],
        ['Aluminium', 'Reprocessor', '0.00', '0.00', '0.00', '0.00'],
        ['Glass remelt', 'Exporter', '0.00', '0.00', '0.00', '0.00'],
        ['Glass remelt', 'Reprocessor', '90.00', '42.50', '0.00', '132.50'],
        ['Monthly reports included', '1 of 2', '2 of 2', '0 of 3', '4 of 9']
      ])
    })

    it('heads the reports row across the two columns that name every other row, so its counts sit under the months', async ({
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

      expect(
        getByRole(documentOf(asHtml(result)), 'rowheader', {
          name: 'Monthly reports included'
        }).getAttribute('colspan')
      ).toBe('2')
    })

    it('states the period the figures cover and when they were taken', async ({
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

      const body = documentOf(asHtml(result))

      expect(getByText(body, 'January to March 2026')).not.toBeNull()
      // The moment is served in UTC and read in UK time, which is an hour ahead
      // in April, so a page showing 9am would be showing the wrong zone.
      expect(
        getByText(body, 'Data taken at 10:00am on 10 April 2026')
      ).not.toBeNull()
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
    config.set('featureFlags.regulatorAccess', true)
  })

  afterAll(() => {
    config.set('featureFlags.regulatorAccess', false)
  })

  it('is not there at all, so nothing is dark-launched behind a scope alone', async ({
    server
  }) => {
    const { statusCode } = await server.inject({
      method: 'GET',
      url: paths.regulators.marketInsights,
      auth: regulator
    })

    expect(statusCode).toBe(statusCodes.notFound)
  })

  it('is not offered from the regulator area either', async ({
    msw,
    server
  }) => {
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
