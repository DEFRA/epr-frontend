import { statusCodes } from '#server/common/constants/status-codes.js'
import { asHtml } from '#server/common/test-helpers/dom.js'
import { it } from '#vite/fixtures/server.js'
import { getAllByRole, getByRole } from '@testing-library/dom'
import { JSDOM } from 'jsdom'
import { describe, expect } from 'vitest'

/**
 * @import { HapiServer } from '#server/common/hapi-types.js'
 */

/**
 * @param {HapiServer} server
 * @param {string} [url]
 */
const getCookiesPage = async (server, url = '/cookies') => {
  const { result, statusCode } = await server.inject({ method: 'GET', url })
  const { document } = new JSDOM(asHtml(result)).window

  return { document, statusCode }
}

/**
 * @param {ReturnType<typeof getByRole>} table
 */
const namesOf = (table) =>
  getAllByRole(table, 'row')
    .slice(1)
    .map((row) => (getAllByRole(row, 'cell')[0].textContent ?? '').trim())

describe('#cookiesController', () => {
  describe('when navigating to /cookies', () => {
    it('should return 200 status code', async ({ server }) => {
      const { statusCode } = await getCookiesPage(server)

      expect(statusCode).toBe(statusCodes.ok)
    })

    it('should render the cookies page with correct title', async ({
      server
    }) => {
      const { document } = await getCookiesPage(server)

      expect(document.title).toStrictEqual(expect.stringMatching(/^Cookies \|/))
    })

    it('should render the page heading', async ({ server }) => {
      const { document } = await getCookiesPage(server)
      const heading = getByRole(document.body, 'heading', { level: 1 })

      expect(heading.textContent).toBe('Cookies')
    })

    it('should render the essential cookies section heading', async ({
      server
    }) => {
      const { document } = await getCookiesPage(server)
      const headings = getAllByRole(document.body, 'heading', { level: 2 })

      expect(headings[0].textContent).toBe('Essential cookies')
    })

    it('should render one table while analytics is off', async ({ server }) => {
      const { document } = await getCookiesPage(server)

      expect(getAllByRole(document.body, 'table')).toHaveLength(1)
    })

    it('should render table headers', async ({ server }) => {
      const { document } = await getCookiesPage(server)
      const table = getByRole(document.body, 'table')
      const headers = getAllByRole(table, 'columnheader').map(
        (header) => header.textContent
      )

      expect(headers).toStrictEqual(['Name', 'Purpose', 'Expires'])
    })

    it('should render all cookie rows', async ({ server }) => {
      const { document } = await getCookiesPage(server)

      expect(namesOf(getByRole(document.body, 'table'))).toStrictEqual([
        'Crumb',
        'Session',
        'userSession',
        'signedOutProvider',
        'analyticsConsent'
      ])
    })
  })

  describe('when navigating to /cy/cookies (Welsh)', () => {
    it('should return 200 status code', async ({ server }) => {
      const { statusCode } = await getCookiesPage(server, '/cy/cookies')

      expect(statusCode).toBe(statusCodes.ok)
    })
  })
})
