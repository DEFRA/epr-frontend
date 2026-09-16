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

/** @import { OutstandingReturnsAggregate } from '../helpers/fetch-outstanding-returns.js' */
/** @import { OutstandingReturnsMonth } from '../helpers/to-outstanding-returns-tables.js' */

const backendUrl = config.get('eprBackendUrl')
const outstandingReturnsUrl = `${backendUrl}/v1/market-insights/:year/:cadence/:period/outstanding-returns`

/** @param {Partial<Record<string, number>>} counts */
const bandsOf = (counts) => ({
  up_to_500: 0,
  up_to_5000: 0,
  up_to_10000: 0,
  over_10000: 0,
  ...counts
})

/**
 * A month with plastic and glass remelt outstanding in a band apiece. The page
 * shows whatever materials are served, so two are enough to see the tables
 * laid out.
 * @param {{ plastic: Partial<Record<string, number>>, glass: Partial<Record<string, number>> }} counts
 * @returns {OutstandingReturnsMonth}
 */
const monthOf = ({ plastic, glass }) => ({
  figures: {
    plastic: bandsOf(plastic),
    glass_re_melt: bandsOf(glass)
  }
})

/** @type {OutstandingReturnsAggregate} */
const januaryToMarch = {
  meta: { generatedAt: '2026-04-10T09:00:00.000Z' },
  data: {
    months: {
      '2026-01': monthOf({ plastic: { over_10000: 2 }, glass: {} }),
      '2026-02': monthOf({ plastic: {}, glass: { up_to_500: 1 } }),
      '2026-03': monthOf({
        plastic: { up_to_5000: 3, over_10000: 1 },
        glass: {}
      })
    }
  }
}

const servesJanuaryToMarch = http.get(outstandingReturnsUrl, () =>
  HttpResponse.json(januaryToMarch)
)

describe('the outstanding monthly returns page', () => {
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

    it('reads a table per material, laid out the way the publication is, bands down and months across', async ({
      server
    }) => {
      const { statusCode, result } = await server.inject({
        method: 'GET',
        url: paths.regulators.marketInsightsOutstandingReturns,
        auth: regulator
      })

      expect(statusCode).toBe(statusCodes.ok)

      const table = getByRole(documentOf(asHtml(result)), 'table', {
        name: 'Returns not submitted for Plastic'
      })

      expect(headingsOf(table)).toStrictEqual([
        'Tonnage band',
        'January',
        'February',
        'March'
      ])
      expect(rowsOf(table)).toStrictEqual([
        ['Up to 500 tonnes', '0', '0', '0'],
        ['Up to 5,000 tonnes', '0', '0', '3'],
        ['Up to 10,000 tonnes', '0', '0', '0'],
        ['Over 10,000 tonnes', '2', '0', '1']
      ])
    })

    it('gives every material served a table, in the order a regulator reads them', async ({
      server
    }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: paths.regulators.marketInsightsOutstandingReturns,
        auth: regulator
      })

      expect(
        getAllByRole(documentOf(asHtml(result)), 'table').map((table) =>
          (table.querySelector('caption')?.textContent ?? '').trim()
        )
      ).toStrictEqual([
        'Returns not submitted for Glass remelt',
        'Returns not submitted for Plastic'
      ])
    })

    it('states the period the figures cover and when they were taken', async ({
      server
    }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: paths.regulators.marketInsightsOutstandingReturns,
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
        url: paths.regulators.marketInsightsOutstandingReturns,
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
        url: paths.regulators.marketInsightsOutstandingReturns,
        auth: regulator
      })

      const trail = getByRole(documentOf(asHtml(result)), 'navigation', {
        name: 'Breadcrumb'
      })

      expect(
        getAllByRole(trail, 'listitem').map((crumb) =>
          (crumb.textContent ?? '').trim()
        )
      ).toStrictEqual(['Market insights', 'Outstanding monthly returns: UK'])
      expect(
        getByRole(trail, 'link', { name: 'Market insights' }).getAttribute(
          'href'
        )
      ).toBe(paths.regulators.marketInsights)
    })

    it('says how the figures are calculated, before the tables', async ({
      server
    }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: paths.regulators.marketInsightsOutstandingReturns,
        auth: regulator
      })

      const body = documentOf(asHtml(result))
      const heading = getByRole(body, 'heading', {
        level: 2,
        name: 'How the figures are calculated'
      })

      // The wording sits between its heading and the tables, so a regulator
      // reads it before the figures it explains.
      /** @type {string[]} */
      const wording = []
      let element = heading.nextElementSibling
      while (element !== null && element.matches('p')) {
        wording.push((element.textContent ?? '').trim())
        element = element.nextElementSibling
      }

      expect(element?.querySelector('table')).not.toBeNull()
      expect(wording).toStrictEqual([
        'The figures count the monthly returns accredited operators owe and have not submitted. Quarterly returns do not count.',
        'One monthly return is owed for each accredited registration, so an operator accredited at two sites owes two returns a month. An operator that is registered but not accredited owes none.',
        'A return is owed for every month the accreditation was valid for any part of, so the month it started counts. A suspended accreditation still owes its returns. A cancelled one owes nothing for a month it stood cancelled throughout, and owes again from a month it was reinstated in.',
        'A month counts as submitted once the operator has submitted it, whatever figures the return carries. A return the operator has started but not submitted does not count, and neither does one submitted for a month the accreditation does not owe.',
        'A tonnage band is the volume of packaging waste, by material, that an operator is accredited to issue notes against. For a reprocessor it is the tonnage it can issue PRNs against at that reprocessing site. For an exporter it is the tonnage it can issue PERNs against for its exports. A return is counted under the band the accreditation holds now, not the band it held in the month the return was owed.',
        'A cell shows 0 where every return owed for that month and band was submitted, and where no operator is accredited for that material and band. Every material and every band appears for every month either way.',
        'The figures are live. They come from the monthly reports and the accreditations held at the time shown above, not from a record of what was published. If an operator submits a return late, its month stops being outstanding.'
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
        url: paths.regulators.marketInsightsOutstandingReturns,
        auth: regulator
      })

      expect(asked.map((url) => url.pathname)).toStrictEqual([
        '/v1/market-insights/2026/monthly/3/outstanding-returns'
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
        http.get(outstandingReturnsUrl, () => {
          asked()
          return HttpResponse.json(januaryToMarch)
        })
      )

      const { statusCode, result } = await server.inject({
        method: 'GET',
        url: paths.regulators.marketInsightsOutstandingReturns,
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
        url: paths.regulators.marketInsightsOutstandingReturns,
        auth: regulatorWithoutMarketScope
      })

      expect(statusCode).toBe(statusCodes.forbidden)
    })
  })
})

describe('the outstanding monthly returns page with the flag off', () => {
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
      url: paths.regulators.marketInsightsOutstandingReturns,
      auth: regulator
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(
      getByRole(documentOf(asHtml(result)), 'table', {
        name: 'Returns not submitted for Plastic'
      })
    ).toBeDefined()
  })

  it('still refuses a session without the market data scope', async ({
    server
  }) => {
    const { statusCode } = await server.inject({
      method: 'GET',
      url: paths.regulators.marketInsightsOutstandingReturns,
      auth: regulatorWithoutMarketScope
    })

    expect(statusCode).toBe(statusCodes.forbidden)
  })
})
