import { config } from '#config/config.js'
import { ANALYTICS_CONSENT_COOKIE } from '#server/common/helpers/analytics/consent.js'
import { asHtml } from '#server/common/test-helpers/dom.js'
import { it } from '#vite/fixtures/server.js'
import { JSDOM } from 'jsdom'
import { afterAll, beforeAll, describe, expect } from 'vitest'

/**
 * @import { HapiServer } from '#server/common/hapi-types.js'
 */

/**
 * @param {HapiServer} server
 * @param {string} [consent]
 */
const getCookiesPage = async (server, consent) => {
  const { result } = await server.inject({
    method: 'GET',
    url: '/cookies',
    headers: consent ? { cookie: `${ANALYTICS_CONSENT_COOKIE}=${consent}` } : {}
  })

  return new JSDOM(asHtml(result)).window.document.body
}

/**
 * @param {Awaited<ReturnType<typeof getCookiesPage>>} body
 * @param {string} testId
 */
const rowsOf = (body, testId) =>
  Array.from(body.querySelectorAll(`[data-testid="${testId}"] tbody tr`)).map(
    (row) =>
      Array.from(row.querySelectorAll('td, th')).map((cell) =>
        (cell.textContent ?? '').trim()
      )
  )

/**
 * @param {Awaited<ReturnType<typeof getCookiesPage>>} body
 */
const analyticsTableOf = (body) =>
  body.querySelector('[data-testid="analytics-cookies"]')

describe('#analyticsChoice', () => {
  describe('when analytics is disabled', () => {
    it('should not list the analytics cookies', async ({ server }) => {
      const body = await getCookiesPage(server)

      expect(analyticsTableOf(body)).toBeNull()
    })

    it('should not offer a choice', async ({ server }) => {
      const body = await getCookiesPage(server)

      expect(body.querySelector('input[name="analytics"]')).toBeNull()
    })
  })

  describe('when analytics is enabled', () => {
    beforeAll(() => {
      config.set('analytics.isEnabled', true)
    })

    afterAll(() => {
      config.set('analytics.isEnabled', false)
    })

    it('should list the analytics cookies it may set', async ({ server }) => {
      const body = await getCookiesPage(server)

      expect(
        rowsOf(body, 'analytics-cookies').map(([name]) => name)
      ).toStrictEqual(['_ga', '_ga_'])
    })

    it('should say when the analytics cookies expire', async ({ server }) => {
      const body = await getCookiesPage(server)

      expect(
        rowsOf(body, 'analytics-cookies').map(([, , expires]) => expires)
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
      const body = await getCookiesPage(server, consent)
      const checked = body.querySelector('input[name="analytics"][checked]')

      expect(checked?.getAttribute('value')).toBe(consent)
    })

    it('should save the choice through the consent route', async ({
      server
    }) => {
      const body = await getCookiesPage(server)
      const form = body.querySelector('form[data-testid="analytics-choice"]')

      expect(form?.getAttribute('action')).toBe('/cookies/consent')
      expect(form?.getAttribute('method')).toBe('post')
      expect(
        form?.querySelector('input[name="returnUrl"]')?.getAttribute('value')
      ).toBe('/cookies')
    })
  })

  describe('whatever the analytics setting', () => {
    it('should list the cookie that remembers the choice as essential', async ({
      server
    }) => {
      const body = await getCookiesPage(server)
      const names = rowsOf(body, 'essential-cookies').map(([name]) => name)

      expect(names).toContain(ANALYTICS_CONSENT_COOKIE)
    })
  })
})
