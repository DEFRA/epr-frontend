/** @import { ServerFixtures } from '#vite/fixtures/server.js'; */
import { config } from '#config/config.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { toYear } from '#server/common/helpers/year.js'
import {
  operator,
  regulator
} from '#server/common/test-helpers/market-insights-fixtures.js'
import { it } from '#vite/fixtures/server.js'
import { load } from 'cheerio'
import { afterAll, beforeAll, beforeEach, describe, expect, vi } from 'vitest'

import { offeredYears } from './helpers/offered-years.js'

vi.mock(import('./helpers/offered-years.js'))

const PATH = '/regulators/market-insights/2026/choose-year'

/**
 * @param {ServerFixtures['server']} server
 * @param {string} [query]
 * @param {string} [url]
 * @param {typeof regulator} [auth]
 */
const choose = (server, query = '', url = PATH, auth = regulator) =>
  server.inject({ method: 'GET', url: `${url}${query}`, auth })

describe('choosing a different year of market insights', () => {
  beforeAll(() => {
    config.set('featureFlags.regulatorAccess', true)
  })

  beforeEach(() => {
    vi.mocked(offeredYears).mockReturnValue([toYear(2027), toYear(2026)])
  })

  afterAll(() => {
    config.set('featureFlags.regulatorAccess', false)
  })

  describe('the page', () => {
    it('offers each year offered, newest first, with the year being viewed selected', async ({
      server
    }) => {
      const { payload } = await choose(server)
      const $ = load(payload)

      expect(
        $('input[name=year]')
          .map((_, input) => $(input).val())
          .get()
      ).toStrictEqual(['2027', '2026'])
      expect($('input[name=year]:checked').val()).toBe('2026')
    })

    it('says what choosing a year is for', async ({ server }) => {
      const { payload } = await choose(server)

      expect(load(payload)('.govuk-hint').text().trim()).toBe(
        'Choose a different year for your reported reprocessor and exporter packaging waste data.'
      )
    })

    it('goes back to the market insights page of the year in the address', async ({
      server
    }) => {
      const { payload } = await choose(server)

      expect(load(payload)('.govuk-back-link').attr('href')).toBe(
        '/regulators/market-insights/2026'
      )
    })

    it('is not found for a year not offered', async ({ server }) => {
      const { statusCode } = await choose(
        server,
        '',
        '/regulators/market-insights/2025/choose-year'
      )

      expect(statusCode).toBe(statusCodes.notFound)
    })

    it('is refused an operator', async ({ server }) => {
      const { statusCode } = await choose(server, '', PATH, operator)

      expect(statusCode).toBe(statusCodes.forbidden)
    })
  })

  describe('continuing', () => {
    it.for([
      { description: 'English', prefix: '' },
      { description: 'Welsh', prefix: '/cy' }
    ])(
      'opens the market insights page of the chosen year, in $description',
      async ({ prefix }, { server }) => {
        const { statusCode, headers } = await choose(
          server,
          '?year=2027',
          `${prefix}${PATH}`
        )

        expect(statusCode).toBe(statusCodes.found)
        expect(headers.location).toBe(
          `${prefix}/regulators/market-insights/2027`
        )
      }
    )

    it.for(['?continue=1', '?year=1999&continue=1'])(
      'asks for a year when none offered is chosen (%s)',
      async (query, { server }) => {
        const { payload, statusCode } = await choose(server, query)

        expect(statusCode).toBe(statusCodes.ok)
        expect(load(payload)('.govuk-error-summary').text()).toContain(
          'Select a year'
        )
      }
    )
  })
})
