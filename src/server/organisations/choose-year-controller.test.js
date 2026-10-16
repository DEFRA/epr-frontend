/** @import { ServerFixtures } from '#vite/fixtures/server.js'; */
import { config } from '#config/config.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { fetchOrganisationYears } from '#server/common/helpers/organisations/fetch-organisation-years.js'
import { year } from '#server/common/helpers/year.js'
import { buildMockAuth } from '#server/common/test-helpers/auth-helper.js'
import { it } from '#vite/fixtures/server.js'
import { load } from 'cheerio'
import { afterEach, beforeEach, describe, expect, vi } from 'vitest'

vi.mock(
  import('#server/common/helpers/organisations/fetch-organisation-years.js')
)

const PATH = '/organisations/500123/2025/choose-year'

const mockAuth = buildMockAuth({
  idToken: 'test-id-token',
  backendToken: 'test-backend-token'
})

/**
 * @param {ServerFixtures['server']} server
 * @param {string} [query]
 * @param {string} [url]
 */
const choose = (server, query = '', url = PATH) =>
  server.inject({ method: 'GET', url: `${url}${query}`, auth: mockAuth })

describe('choosing a different year', () => {
  beforeEach(() => {
    config.set('featureFlags.navigateAcrossYears', true)
    vi.mocked(fetchOrganisationYears).mockResolvedValue([
      year(2026),
      year(2025)
    ])
  })

  afterEach(() => {
    config.set('featureFlags.navigateAcrossYears', false)
  })

  describe('the page', () => {
    it('offers each year the organisation has, newest first', async ({
      server
    }) => {
      const { payload } = await choose(server)

      expect(
        load(payload)('input[name=year]')
          .map((_, input) => load(payload)(input).val())
          .get()
      ).toStrictEqual(['2026', '2025'])
    })

    it('selects no year to begin with', async ({ server }) => {
      const { payload } = await choose(server)

      expect(load(payload)('input[name=year]:checked')).toHaveLength(0)
    })

    it('goes back to the home page of the year in the address', async ({
      server
    }) => {
      const { payload } = await choose(server)

      expect(load(payload)('.govuk-back-link').attr('href')).toBe(
        '/organisations/500123/2025'
      )
    })

    it('is not found for a year the organisation does not have', async ({
      server
    }) => {
      const { statusCode } = await choose(
        server,
        '',
        '/organisations/500123/1999/choose-year'
      )

      expect(statusCode).toBe(statusCodes.notFound)
    })

    it('is not found for an address year that is not four digits', async ({
      server
    }) => {
      const { statusCode } = await choose(
        server,
        '',
        '/organisations/500123/abc/choose-year'
      )

      expect(statusCode).toBe(statusCodes.notFound)
    })

    it('is not found while the flag is off', async ({ server }) => {
      config.set('featureFlags.navigateAcrossYears', false)

      const { statusCode } = await choose(server)

      expect(statusCode).toBe(statusCodes.notFound)
    })
  })

  describe('continuing', () => {
    it('opens the home page of the chosen year', async ({ server }) => {
      const { statusCode, headers } = await choose(server, '?year=2026')

      expect(statusCode).toBe(statusCodes.found)
      expect(headers.location).toBe('/organisations/500123/2026')
    })

    it('keeps the Welsh prefix', async ({ server }) => {
      const { headers } = await choose(
        server,
        '?year=2026',
        '/cy/organisations/500123/2025/choose-year'
      )

      expect(headers.location).toBe('/cy/organisations/500123/2026')
    })

    it('asks for a year when none is chosen', async ({ server }) => {
      const { payload, statusCode } = await choose(server, '?continue=1')

      expect(statusCode).toBe(statusCodes.ok)
      expect(load(payload)('.govuk-error-summary').text()).toContain(
        'Select a year'
      )
      expect(load(payload)('input[name=year]:checked')).toHaveLength(0)
    })

    it("asks for a year when the chosen year is not one of the organisation's", async ({
      server
    }) => {
      const { payload, statusCode } = await choose(
        server,
        '?year=1999&continue=1'
      )

      expect(statusCode).toBe(statusCodes.ok)
      expect(load(payload)('.govuk-error-summary').text()).toContain(
        'Select a year'
      )
    })

    it('is not found while the flag is off', async ({ server }) => {
      config.set('featureFlags.navigateAcrossYears', false)

      const { statusCode } = await choose(server, '?year=2026')

      expect(statusCode).toBe(statusCodes.notFound)
    })
  })
})
