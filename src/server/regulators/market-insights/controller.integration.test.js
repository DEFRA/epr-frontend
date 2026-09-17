import { config } from '#config/config.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { asHtml, documentOf } from '#server/common/test-helpers/dom.js'
import {
  NOTICE,
  operator,
  regulator,
  regulatorWithoutMarketScope
} from '#server/common/test-helpers/market-insights-fixtures.js'
import { paths } from '#server/paths.js'
import { it } from '#vite/fixtures/server.js'
import { getAllByRole, getByRole, queryByRole } from '@testing-library/dom'
import { http, HttpResponse } from 'msw'
import { afterAll, beforeAll, describe, expect, vi } from 'vitest'

const backendUrl = config.get('eprBackendUrl')
const marketInsightsUrl = `${backendUrl}/v1/market-insights/*`

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
 * The links the page offers, by the words a regulator reads and the address
 * each one opens.
 * @param {ReturnType<typeof documentOf>} body
 * @returns {{ name: string, href: string | null }[]}
 */
const figureSetLinksOf = (body) =>
  getAllByRole(getByRole(getByRole(body, 'main'), 'list'), 'link').map(
    (link) => ({
      name: (link.textContent ?? '').trim(),
      href: link.getAttribute('href')
    })
  )

describe('the market insights page', () => {
  beforeAll(() => {
    config.set('featureFlags.regulatorAccess', true)
    config.set('featureFlags.marketInsights', true)
  })

  afterAll(() => {
    config.set('featureFlags.regulatorAccess', false)
    config.set('featureFlags.marketInsights', false)
  })

  describe('a regulator', () => {
    it('is offered a page for each set of figures the workbook publishes', async ({
      server
    }) => {
      const { statusCode, result } = await server.inject({
        method: 'GET',
        url: paths.regulators.marketInsights,
        auth: regulator
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(figureSetLinksOf(documentOf(asHtml(result)))).toStrictEqual([
        {
          name: 'UK waste balance',
          href: paths.regulators.marketInsightsWasteBalance
        },
        {
          name: 'Reprocessor and exporter figures: UK',
          href: paths.regulators.marketInsightsUk
        },
        {
          name: 'Reprocessor and exporter figures: England',
          href: paths.regulators.marketInsightsEngland
        },
        {
          name: 'Outstanding monthly reports: UK',
          href: paths.regulators.marketInsightsOutstandingReturns
        }
      ])
    })

    it('asks the backend for no figures, because it shows none', async ({
      msw,
      server
    }) => {
      const asked = vi.fn()

      msw.use(
        http.get(marketInsightsUrl, () => {
          asked()
          return HttpResponse.json({})
        })
      )

      await server.inject({
        method: 'GET',
        url: paths.regulators.marketInsights,
        auth: regulator
      })

      expect(asked).not.toHaveBeenCalled()
    })

    it('says the page is still being built, above the description', async ({
      server
    }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: paths.regulators.marketInsights,
        auth: regulator
      })

      const heading = getByRole(documentOf(asHtml(result)), 'heading', {
        level: 1
      })

      expect(heading.nextElementSibling?.textContent.trim()).toBe(NOTICE)
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
    it('is refused the page', async ({ server }) => {
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
    config.set('featureFlags.marketInsights', false)
  })

  afterAll(() => {
    config.set('featureFlags.regulatorAccess', false)
  })

  it('still answers a regulator who types the URL', async ({ server }) => {
    const { statusCode, result } = await server.inject({
      method: 'GET',
      url: paths.regulators.marketInsights,
      auth: regulator
    })

    expect(statusCode).toBe(statusCodes.ok)

    // The flag governs the way in from the regulator area, not what this page
    // holds, so the sets of figures are still offered. Which ones is the
    // flag-on test's to state.
    expect(figureSetLinksOf(documentOf(asHtml(result)))).not.toHaveLength(0)
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
