import { config } from '#config/config.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { asHtml, documentOf } from '#server/common/test-helpers/dom.js'
import {
  LANDING_HEADING,
  NOTICE,
  operator,
  regulator,
  regulatorWithoutMarketScope
} from '#server/common/test-helpers/market-insights-fixtures.js'
import { toYear } from '#server/common/helpers/year.js'
import { paths } from '#server/paths.js'
import { it } from '#vite/fixtures/server.js'
import {
  getAllByRole,
  getByRole,
  getByText,
  queryByRole
} from '@testing-library/dom'
import { http, HttpResponse } from 'msw'
import { afterAll, beforeAll, describe, expect, vi } from 'vitest'

import { offeredYears } from './helpers/offered-years.js'
import { yearPath } from './helpers/year-path.js'

vi.mock(import('./helpers/offered-years.js'))

const landingUrl = yearPath(paths.regulators.marketInsightsYear, toYear(2026))

const backendUrl = config.get('eprBackendUrl')
const marketInsightsUrl = `${backendUrl}/v1/market-insights/*`

/**
 * The regulator home page fetches its own list, and these tests are about the
 * link it offers rather than what that list holds.
 */
const anEmptyPageOfOrganisations = http.get(`${backendUrl}/organisations`, () =>
  HttpResponse.json({
    items: [],
    page: 1,
    pageSize: 50,
    totalItems: 0,
    totalPages: 0
  })
)

// The link from the regulator area to this page.
const HOME_LINK = 'View reported reprocessor and exporter packaging waste data'

// The sets of figures the page offers, in the order the workbook's tabs run,
// with the nations the workbook does not publish after England.
const FIGURE_SETS = [
  {
    name: 'UK waste balance',
    href: yearPath(paths.regulators.marketInsightsWasteBalance, toYear(2026))
  },
  {
    name: 'Reprocessor and exporter figures: UK',
    href: yearPath(paths.regulators.marketInsightsUk, toYear(2026))
  },
  {
    name: 'Reprocessor and exporter figures: England',
    href: yearPath(paths.regulators.marketInsightsEngland, toYear(2026))
  },
  {
    name: 'Reprocessor and exporter figures: Wales',
    href: yearPath(paths.regulators.marketInsightsWales, toYear(2026))
  },
  {
    name: 'Reprocessor and exporter figures: Scotland',
    href: yearPath(paths.regulators.marketInsightsScotland, toYear(2026))
  },
  {
    name: 'Reprocessor and exporter figures: Northern Ireland',
    href: yearPath(paths.regulators.marketInsightsNorthernIreland, toYear(2026))
  },
  {
    name: 'Missing monthly reports: UK',
    href: yearPath(
      paths.regulators.marketInsightsOutstandingReturns,
      toYear(2026)
    )
  }
]

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
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-04-10T09:00:00.000Z'))
    vi.mocked(offeredYears).mockReturnValue([toYear(2026)])
    config.set('featureFlags.regulatorAccess', true)
    config.set('featureFlags.marketInsights', true)
  })

  afterAll(() => {
    vi.useRealTimers()
    config.set('featureFlags.regulatorAccess', false)
    config.set('featureFlags.marketInsights', false)
  })

  describe('a regulator', () => {
    it('is offered a page for each set of figures', async ({ server }) => {
      const { statusCode, result } = await server.inject({
        method: 'GET',
        url: landingUrl,
        auth: regulator
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(figureSetLinksOf(documentOf(asHtml(result)))).toStrictEqual(
        FIGURE_SETS
      )
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
        url: landingUrl,
        auth: regulator
      })

      expect(asked).not.toHaveBeenCalled()
    })

    it('is offered the workbook, in the published format, as one download', async ({
      server
    }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: landingUrl,
        auth: regulator
      })

      expect(
        getByRole(documentOf(asHtml(result)), 'link', {
          name: 'Download the published (redacted) data workbook (XLSX)'
        }).getAttribute('href')
      ).toBe(yearPath(paths.regulators.marketInsightsWorkbook, toYear(2026)))
    })

    it('is offered the unredacted workbook as a download of its own', async ({
      server
    }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: landingUrl,
        auth: regulator
      })

      expect(
        getByRole(documentOf(asHtml(result)), 'link', {
          name: 'Download the unredacted data workbook (XLSX)'
        }).getAttribute('href')
      ).toBe(
        yearPath(
          paths.regulators.marketInsightsUnredactedWorkbook,
          toYear(2026)
        )
      )
    })

    it('is offered every figure behind those pages as one download', async ({
      server
    }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: landingUrl,
        auth: regulator
      })

      expect(
        getByRole(documentOf(asHtml(result)), 'link', {
          name: 'Download all the figures (ZIP)'
        }).getAttribute('href')
      ).toBe(yearPath(paths.regulators.marketInsightsExport, toYear(2026)))
    })

    it('names the page for the data it holds and its year', async ({
      server
    }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: landingUrl,
        auth: regulator
      })

      const body = documentOf(asHtml(result))

      expect(getByRole(body, 'heading', { level: 1 }).textContent.trim()).toBe(
        `2026 ${LANDING_HEADING}`
      )
      expect(body.ownerDocument.title).toMatch(
        new RegExp(`^2026 ${LANDING_HEADING} \\|`)
      )
    })

    it('offers the downloads before the pages for each set of figures, and says nothing is still being built', async ({
      server
    }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: landingUrl,
        auth: regulator
      })

      const main = getByRole(documentOf(asHtml(result)), 'main')

      expect(
        getAllByRole(main, 'heading', { level: 2 }).map((heading) =>
          heading.textContent.trim()
        )
      ).toStrictEqual([
        'Download aggregated data',
        'Data specific pages',
        'Download the figures'
      ])
      expect(main.textContent).toContain(
        'Files can take up to a minute to prepare before the download starts.'
      )
      expect(main.textContent).not.toContain(NOTICE)
    })

    it('says which year the data is for, as text above the page heading', async ({
      server
    }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: landingUrl,
        auth: regulator
      })

      const body = documentOf(asHtml(result))
      const yearLine = getByText(body, 'This is 2026 data')

      expect(
        queryByRole(body, 'heading', { name: 'This is 2026 data' })
      ).toBeNull()

      expect(
        yearLine.compareDocumentPosition(
          getByRole(body, 'heading', { level: 1 })
        )
      ).toBe(yearLine.DOCUMENT_POSITION_FOLLOWING)
    })

    it('offers no other year while only one is offered', async ({ server }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: landingUrl,
        auth: regulator
      })

      expect(
        queryByRole(documentOf(asHtml(result)), 'link', {
          name: 'Choose a different year'
        })
      ).toBeNull()
    })

    it('offers a choice of year once more than one is offered', async ({
      server
    }) => {
      vi.mocked(offeredYears).mockReturnValue([toYear(2027), toYear(2026)])

      const { result } = await server.inject({
        method: 'GET',
        url: landingUrl,
        auth: regulator
      })

      vi.mocked(offeredYears).mockReturnValue([toYear(2026)])

      expect(
        getByRole(documentOf(asHtml(result)), 'link', {
          name: 'Choose a different year'
        }).getAttribute('href')
      ).toBe('/regulators/market-insights/2026/choose-year')
    })

    it('has no page for a year not offered', async ({ server }) => {
      const { statusCode } = await server.inject({
        method: 'GET',
        url: yearPath(paths.regulators.marketInsightsYear, toYear(2025)),
        auth: regulator
      })

      expect(statusCode).toBe(statusCodes.notFound)
    })

    it('is sent from the year-less address to the current reporting year', async ({
      server
    }) => {
      const { statusCode, headers } = await server.inject({
        method: 'GET',
        url: paths.regulators.marketInsights,
        auth: regulator
      })

      expect(statusCode).toBe(statusCodes.found)
      expect(headers.location).toBe('/regulators/market-insights/2026')
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
          name: HOME_LINK
        }).getAttribute('href')
      ).toBe(paths.regulators.marketInsights)
    })
  })

  describe('an operator', () => {
    it('is refused the page', async ({ server }) => {
      const { statusCode, result } = await server.inject({
        method: 'GET',
        url: landingUrl,
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
        url: landingUrl,
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
          name: HOME_LINK
        })
      ).toBeNull()
    })
  })

  it.for([
    { description: 'an operator', auth: operator },
    {
      description: 'a session with no market data scope',
      auth: regulatorWithoutMarketScope
    }
  ])(
    'refuses $description the year-less address',
    async ({ auth }, { server }) => {
      const { statusCode } = await server.inject({
        method: 'GET',
        url: paths.regulators.marketInsights,
        auth
      })

      expect(statusCode).toBe(statusCodes.forbidden)
    }
  )
})

describe('the market insights page with the flag off', () => {
  beforeAll(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-04-10T09:00:00.000Z'))
    vi.mocked(offeredYears).mockReturnValue([toYear(2026)])
    config.set('featureFlags.regulatorAccess', true)
    config.set('featureFlags.marketInsights', false)
  })

  afterAll(() => {
    vi.useRealTimers()
    config.set('featureFlags.regulatorAccess', false)
  })

  it('still answers a regulator who types the URL', async ({ server }) => {
    const { statusCode, result } = await server.inject({
      method: 'GET',
      url: landingUrl,
      auth: regulator
    })

    expect(statusCode).toBe(statusCodes.ok)

    // The flag governs the way in from the regulator area, not what this page
    // holds, so every set of figures is still offered.
    expect(figureSetLinksOf(documentOf(asHtml(result)))).toStrictEqual(
      FIGURE_SETS
    )
  })

  it('still refuses a session without the market data scope', async ({
    server
  }) => {
    const { statusCode } = await server.inject({
      method: 'GET',
      url: landingUrl,
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
        name: HOME_LINK
      })
    ).toBeNull()
  })
})
