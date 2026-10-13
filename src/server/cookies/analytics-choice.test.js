import { config } from '#config/config.js'
import { ANALYTICS_CONSENT_COOKIE } from '#server/common/analytics/consent.js'
import { chooseAnalytics } from '#server/common/test-helpers/consent-helper.js'
import { asHtml } from '#server/common/test-helpers/dom.js'
import { it } from '#vite/fixtures/server.js'
import { getByRole, queryByRole } from '@testing-library/dom'
import { JSDOM } from 'jsdom'
import { afterAll, beforeAll, describe, expect } from 'vitest'

/**
 * @import { HapiServer } from '#server/common/hapi-types.js'
 */

/**
 * @param {HapiServer} server
 * @param {string} [cookie]
 */
const getCookiesPage = async (server, cookie) => {
  const { result } = await server.inject({
    method: 'GET',
    url: '/cookies',
    headers: cookie ? { cookie } : {}
  })

  return new JSDOM(asHtml(result)).window.document.body
}

/**
 * @param {unknown} result
 */
const bodyOf = (result) => new JSDOM(asHtml(result)).window.document.body

/**
 * @param {ReturnType<typeof bodyOf>} body
 */
const carriedBackUrl = (body) =>
  getByRole(body, 'group', { name: /accept analytics cookies/i })
    .closest('form')
    ?.querySelector('input[name="backUrl"]')
    ?.getAttribute('value') ?? null

/**
 * @param {ReturnType<typeof bodyOf>} body
 */
const backLink = (body) =>
  queryByRole(getByRole(body, 'alert'), 'link', {
    name: 'Go back to the page you were looking at'
  })

/**
 * @param {string | string[] | undefined} setCookie
 */
const cookieNamesFrom = (setCookie) =>
  [setCookie ?? []].flat().map((value) => value.split('=')[0])

/**
 * The table a heading introduces, so a test names the section the way the page
 * does rather than reaching for a selector the page only carries for tests.
 * @param {Awaited<ReturnType<typeof getCookiesPage>>} body
 * @param {string | RegExp} heading
 */
const tableUnder = (body, heading) => {
  const sections = Array.from(body.querySelectorAll('h2, table'))
  const start = sections.indexOf(getByRole(body, 'heading', { name: heading }))

  return sections
    .slice(start + 1)
    .find((element) => element.tagName === 'TABLE')
}

/**
 * @param {Awaited<ReturnType<typeof getCookiesPage>>} body
 * @param {string | RegExp} heading
 */
const rowsOf = (body, heading) =>
  Array.from(tableUnder(body, heading)?.querySelectorAll('tbody tr') ?? []).map(
    (row) =>
      Array.from(row.querySelectorAll('td, th')).map((cell) =>
        (cell.textContent ?? '').trim()
      )
  )

describe('#analyticsChoice', () => {
  describe('when analytics is disabled', () => {
    it('should not list the analytics cookies', async ({ server }) => {
      const body = await getCookiesPage(server)

      expect(
        queryByRole(body, 'heading', { name: /analytics cookies/i })
      ).toBeNull()
    })

    it('should not offer a choice', async ({ server }) => {
      const body = await getCookiesPage(server)

      expect(body.querySelector('input[name="analytics"]')).toBeNull()
    })
  })

  describe('when analytics is enabled', () => {
    beforeAll(() => {
      config.set('analytics.isEnabled', true)
      config.set('analytics.measurementId', 'G-TESTONLY01')
    })

    afterAll(() => {
      config.set('analytics.isEnabled', false)
      config.set('analytics.measurementId', '')
    })

    it('should list the analytics cookies it may set', async ({ server }) => {
      const body = await getCookiesPage(server)

      expect(
        rowsOf(body, /analytics cookies/i).map(([name]) => name)
      ).toStrictEqual(['_ga', '_ga_'])
    })

    it('should say when the analytics cookies expire', async ({ server }) => {
      const body = await getCookiesPage(server)

      expect(
        rowsOf(body, /analytics cookies/i).map(([, , expires]) => expires)
      ).toStrictEqual(['400 days', '400 days'])
    })

    it('should offer both choices', async ({ server }) => {
      const body = await getCookiesPage(server)
      const choices = body.querySelectorAll('input[name="analytics"]')

      expect(
        Array.from(choices).map((input) => input.getAttribute('value'))
      ).toStrictEqual(['accepted', 'rejected'])
    })

    it('should preselect nothing before a choice is made', async ({
      server
    }) => {
      const body = await getCookiesPage(server)

      expect(body.querySelector('input[name="analytics"][checked]')).toBeNull()
    })

    it.for([
      ['accepted', 'accepted'],
      ['rejected', 'rejected']
    ])('should show %s as the saved choice', async ([consent], { server }) => {
      const body = await getCookiesPage(
        server,
        `${ANALYTICS_CONSENT_COOKIE}=${consent}`
      )
      const checked = body.querySelector('input[name="analytics"][checked]')

      expect(checked?.getAttribute('value')).toBe(consent)
    })

    it('should save the choice through the consent route', async ({
      server
    }) => {
      const body = await getCookiesPage(server)
      const form = getByRole(body, 'group', {
        name: /accept analytics cookies/i
      }).closest('form')

      expect(form?.getAttribute('action')).toBe('/cookies/consent')
      expect(form?.getAttribute('method')).toBe('post')
      expect(
        form?.querySelector('input[name="returnUrl"]')?.getAttribute('value')
      ).toBe('/cookies')
    })

    it('should keep a welsh visitor on the welsh page once saved', async ({
      server
    }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: '/cy/cookies'
      })
      const form = getByRole(
        new JSDOM(asHtml(result)).window.document.body,
        'group',
        { name: /accept analytics cookies/i }
      ).closest('form')

      expect(
        form?.querySelector('input[name="returnUrl"]')?.getAttribute('value')
      ).toBe('/cy/cookies')
    })

    it.for(['accepted', 'rejected'])(
      'should confirm the preferences were set having %s',
      async (analytics, { server }) => {
        const cookie = await chooseAnalytics(server, {
          analytics,
          returnUrl: '/cookies'
        })
        const body = await getCookiesPage(server, cookie)

        expect(getByRole(body, 'alert').textContent).toContain(
          "You've set your cookie preferences."
        )
      }
    )

    it('should not repeat the confirmation in a cookie banner', async ({
      server
    }) => {
      const cookie = await chooseAnalytics(server, {
        analytics: 'accepted',
        returnUrl: '/cookies'
      })
      const body = await getCookiesPage(server, cookie)

      expect(queryByRole(body, 'region', { name: /cookies on/i })).toBeNull()
    })

    it('should not confirm anything before a choice is saved', async ({
      server
    }) => {
      const body = await getCookiesPage(server)

      expect(queryByRole(body, 'alert')).toBeNull()
    })
  })

  describe('the way back to the page the visitor was looking at', () => {
    beforeAll(() => {
      config.set('analytics.isEnabled', true)
      config.set('analytics.measurementId', 'G-TESTONLY01')
    })

    afterAll(() => {
      config.set('analytics.isEnabled', false)
      config.set('analytics.measurementId', '')
    })

    it.for([
      {
        description: 'a page of this service',
        referer: 'https://service.test/cy/start?page=2',
        expected: '/cy/start?page=2'
      },
      {
        description: 'another site',
        referer: 'https://evil.example.com/start',
        expected: null
      },
      {
        description: 'the cookies page itself',
        referer: 'https://service.test/cookies',
        expected: null
      },
      {
        description: 'the welsh cookies page',
        referer: 'https://service.test/cy/cookies',
        expected: null
      },
      { description: 'nowhere', referer: undefined, expected: null }
    ])(
      'should carry $expected through the save arriving from $description',
      async ({ referer, expected }, { server }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: '/cookies',
          headers: { host: 'service.test', ...(referer && { referer }) }
        })

        expect(carriedBackUrl(bodyOf(result))).toBe(expected)
      }
    )

    it('should offer the way back once saved', async ({ server }) => {
      const cookie = await chooseAnalytics(server, {
        analytics: 'accepted',
        backUrl: '/cy/start?page=2',
        returnUrl: '/cookies'
      })
      const body = await getCookiesPage(server, cookie)

      expect(backLink(body)?.getAttribute('href')).toBe('/cy/start?page=2')
    })

    it('should still carry the way back for a second save', async ({
      server
    }) => {
      const cookie = await chooseAnalytics(server, {
        analytics: 'accepted',
        backUrl: '/start',
        returnUrl: '/cookies'
      })
      const body = await getCookiesPage(server, cookie)

      expect(carriedBackUrl(body)).toBe('/start')
    })

    it.for([
      { description: 'none was known', backUrl: undefined },
      { description: 'it leaves the service', backUrl: '/\\evil.example.com' }
    ])(
      'should offer no way back when $description',
      async ({ backUrl }, { server }) => {
        const cookie = await chooseAnalytics(server, {
          analytics: 'accepted',
          backUrl,
          returnUrl: '/cookies'
        })
        const body = await getCookiesPage(server, cookie)

        expect(getByRole(body, 'alert')).not.toBeNull()
        expect(backLink(body)).toBeNull()
      }
    )
  })

  describe('whatever the analytics setting', () => {
    it('should list the cookie that remembers the choice as essential', async ({
      server
    }) => {
      const body = await getCookiesPage(server)
      const names = rowsOf(body, 'Essential cookies').map(([name]) => name)

      expect(names).toContain(ANALYTICS_CONSENT_COOKIE)
    })

    it('should still serve not found for an address no route matches', async ({
      server
    }) => {
      const { statusCode } = await server.inject({
        method: 'GET',
        url: '/no-such-page'
      })

      expect(statusCode).toBe(404)
    })

    it.for(['/start', '/cookies'])(
      'should not start a session for an anonymous visit to %s',
      async (url, { server }) => {
        const { headers } = await server.inject({ method: 'GET', url })

        expect(cookieNamesFrom(headers['set-cookie'])).not.toContain(
          config.get('session.cache.name')
        )
      }
    )
  })
})
