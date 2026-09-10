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
import {
  getByRole,
  getByText,
  queryByRole,
  queryByText
} from '@testing-library/dom'
import { JSDOM } from 'jsdom'
import { http, HttpResponse } from 'msw'
import { afterAll, beforeAll, describe, expect, vi } from 'vitest'

/**
 * @import { WasteBalanceAggregate } from './helpers/fetch-waste-balance.js'
 * @import { WasteBalanceFigure } from './helpers/to-waste-balance-table.js'
 */

const backendUrl = config.get('eprBackendUrl')
const wasteBalanceUrl = `${backendUrl}/v1/market-insights/waste-balance`

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

/** @type {WasteBalanceFigure} */
const glassReprocessedInJanuary = {
  material: 'Glass Re-melt',
  accreditationType: 'reprocessor',
  month: '2026-01',
  totalCredited: 120,
  eligibleForWasteBalance: 100,
  sentOnDeductions: 10,
  netCredit: 90
}

/** @type {WasteBalanceFigure} */
const glassReprocessedInFebruary = {
  ...glassReprocessedInJanuary,
  month: '2026-02',
  netCredit: 42.5
}

/** @type {WasteBalanceFigure} */
const aluminiumExportedInFebruary = {
  material: 'Aluminium',
  accreditationType: 'exporter',
  month: '2026-02',
  totalCredited: 8,
  eligibleForWasteBalance: 8,
  sentOnDeductions: 0,
  netCredit: 8
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
 * @param {WasteBalanceFigure[]} figures
 * @returns {WasteBalanceAggregate}
 */
const aggregateOf = (figures) => ({
  meta: { generatedAt: '2026-09-10T09:00:00.000Z', reportingYear: 2026 },
  data: figures
})

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
    vi.setSystemTime(new Date('2026-09-10T09:00:00.000Z'))
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
        http.get(wasteBalanceUrl, () =>
          HttpResponse.json(
            aggregateOf([
              glassReprocessedInJanuary,
              glassReprocessedInFebruary,
              aluminiumExportedInFebruary
            ])
          )
        )
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
        'Total'
      ])
      expect(rowsOf(body)).toStrictEqual([
        ['Aluminium', 'Exporter', '0.00', '8.00', '8.00'],
        ['Glass Re-melt', 'Reprocessor', '90.00', '42.50', '132.50']
      ])
    })

    it('asks for the reporting year now in progress, and says which year it is showing', async ({
      msw,
      server
    }) => {
      /** @type {URL | undefined} */
      let captured

      msw.use(
        http.get(wasteBalanceUrl, ({ request }) => {
          captured = new URL(request.url)
          return HttpResponse.json(aggregateOf([glassReprocessedInJanuary]))
        })
      )

      const { result } = await server.inject({
        method: 'GET',
        url: paths.regulators.marketInsights,
        auth: regulator
      })

      expect(/** @type {URL} */ (captured).searchParams.get('year')).toBe(
        '2026'
      )
      expect(
        getByText(documentOf(asHtml(result)), 'Reporting year 2026')
      ).not.toBeNull()
    })

    it('says the year has no figures yet rather than showing an empty table', async ({
      msw,
      server
    }) => {
      msw.use(
        http.get(wasteBalanceUrl, () => HttpResponse.json(aggregateOf([])))
      )

      const { statusCode, result } = await server.inject({
        method: 'GET',
        url: paths.regulators.marketInsights,
        auth: regulator
      })

      expect(statusCode).toBe(statusCodes.ok)

      const body = documentOf(asHtml(result))

      expect(body.querySelector('table')).toBeNull()
      expect(
        queryByText(
          body,
          'No waste balance figures have been reported for this year yet.'
        )
      ).not.toBeNull()
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
          return HttpResponse.json(aggregateOf([]))
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
