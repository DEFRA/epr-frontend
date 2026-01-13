import { statusCodes } from '#server/common/constants/status-codes.js'
import { load } from 'cheerio'
import { describe, expect } from 'vitest'
import { it } from '#vite/fixtures/server.js'

describe('#cookiesController', () => {
  describe('when navigating to /cookies', () => {
    it('should return 200 status code', async ({ server }) => {
      const { statusCode } = await server.inject({
        method: 'GET',
        url: '/cookies'
      })

      expect(statusCode).toBe(statusCodes.ok)
    })

    it('should render the cookies page with correct title', async ({
      server
    }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: '/cookies'
      })

      const $ = load(result)

      expect($('title').text().trim()).toStrictEqual(
        expect.stringMatching(/^Cookies \|/)
      )
    })

    it('should render the page heading', async ({ server }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: '/cookies'
      })

      const $ = load(result)

      expect($('h1').text()).toBe('Cookies')
    })

    it('should render the essential cookies section heading', async ({
      server
    }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: '/cookies'
      })

      const $ = load(result)

      expect($('h2.govuk-heading-m').first().text()).toBe('Essential cookies')
    })

    it('should render a table with cookie information', async ({ server }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: '/cookies'
      })

      const $ = load(result)
      const table = $('.govuk-table')

      expect(table).toHaveLength(1)
    })

    it('should render table headers', async ({ server }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: '/cookies'
      })

      const $ = load(result)
      const headers = $('.govuk-table__header')
        .map((_, el) => $(el).text())
        .get()

      expect(headers).toContain('Name')
      expect(headers).toContain('Purpose')
      expect(headers).toContain('Expires')
    })

    it('should render all cookie rows', async ({ server }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: '/cookies'
      })

      const $ = load(result)
      const rows = $('.govuk-table__body .govuk-table__row')

      expect(rows).toHaveLength(3)
    })

    it('should render cookie names in the table', async ({ server }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: '/cookies'
      })

      const $ = load(result)
      const cellTexts = $('.govuk-table__cell')
        .map((_, el) => $(el).text())
        .get()

      expect(cellTexts).toContain('crumb')
      expect(cellTexts).toContain('session')
      expect(cellTexts).toContain('userSession')
    })
  })

  describe('when navigating to /cy/cookies (Welsh)', () => {
    it('should return 200 status code', async ({ server }) => {
      const { statusCode } = await server.inject({
        method: 'GET',
        url: '/cy/cookies'
      })

      expect(statusCode).toBe(statusCodes.ok)
    })
  })
})
