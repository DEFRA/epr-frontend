import { config } from '#config/config.js'
import { ANALYTICS_CONSENT_COOKIE } from '#server/common/analytics/consent.js'
import { chooseAnalytics } from '#server/common/test-helpers/consent-helper.js'
import {
  extractCookieValues,
  mergeCookies
} from '#server/common/test-helpers/cookie-helper.js'
import { asHtml } from '#server/common/test-helpers/dom.js'
import { it } from '#vite/fixtures/server.js'
import { getByRole, queryByRole } from '@testing-library/dom'
import { JSDOM } from 'jsdom'
import { afterAll, beforeAll, describe, expect } from 'vitest'

/**
 * @import { HapiServer } from '#server/common/hapi-types.js'
 */

/**
 * @param {unknown} result
 */
const bodyOf = (result) => new JSDOM(asHtml(result)).window.document.body

/**
 * @param {{ server: HapiServer }} fixtures
 * @param {string} [cookie]
 */
const getStartPage = async ({ server }, cookie) =>
  server.inject({
    method: 'GET',
    url: '/start',
    headers: cookie ? { cookie } : {}
  })

/**
 * @param {{ server: HapiServer }} fixtures
 * @param {string} analytics
 * @returns {Promise<{ cookie: string }>}
 */
const answerBanner = async ({ server }, analytics) => ({
  cookie: await chooseAnalytics(server, { analytics, returnUrl: '/start' })
})

describe('#cookieBanner', () => {
  describe('when analytics is disabled', () => {
    it('should not render the banner', async ({ server }) => {
      const { result } = await getStartPage({ server })
      const banner = queryByRole(bodyOf(result), 'region', {
        name: /cookies on/i
      })

      expect(banner).toBeNull()
    })
  })

  describe('when analytics is enabled and no choice has been made', () => {
    beforeAll(() => {
      config.set('analytics.isEnabled', true)
      config.set('analytics.measurementId', 'G-TESTONLY01')
    })

    afterAll(() => {
      config.set('analytics.isEnabled', false)
      config.set('analytics.measurementId', '')
    })

    it('should render the banner naming the service', async ({ server }) => {
      const { result } = await getStartPage({ server })
      const banner = getByRole(bodyOf(result), 'region', {
        name: /cookies on/i
      })

      expect(banner).not.toBeNull()
    })

    it('should say which cookies are essential and which are not', async ({
      server
    }) => {
      const { result } = await getStartPage({ server })
      const banner = getByRole(bodyOf(result), 'region', {
        name: /cookies on/i
      })

      expect(banner.textContent).toContain(
        'We use some essential cookies to make this service work.'
      )
      expect(banner.textContent).toContain(
        "We'd also like to use analytics cookies so we can understand how you use the service and make improvements."
      )
    })

    it('should offer accept, reject and view cookies', async ({ server }) => {
      const banner = getByRole(
        bodyOf((await getStartPage({ server })).result),
        'region',
        {
          name: /cookies on/i
        }
      )

      expect(
        getByRole(banner, 'button', { name: 'Accept analytics cookies' })
      ).not.toBeNull()
      expect(
        getByRole(banner, 'button', { name: 'Reject analytics cookies' })
      ).not.toBeNull()
      expect(getByRole(banner, 'link', { name: 'View cookies' })).not.toBeNull()
    })

    it('should post the choice back with the csrf token it was issued', async ({
      server
    }) => {
      const { headers, result } = await getStartPage({ server })
      const form = bodyOf(result).querySelector(
        'form[action="/cookies/consent"]'
      )
      const issuedCrumb = /** @type {string[]} */ (headers['set-cookie'] ?? [])
        .find((cookie) => cookie.startsWith('crumb='))
        ?.split(';')[0]
        .split('=')[1]

      expect(form?.getAttribute('method')).toBe('post')
      expect(
        form?.querySelector('input[name="crumb"]')?.getAttribute('value')
      ).toBe(issuedCrumb)
    })

    it('should return the visitor to the page they answered from', async ({
      server
    }) => {
      const body = bodyOf((await getStartPage({ server })).result)
      const returnUrl = body.querySelector('input[name="returnUrl"]')

      expect(returnUrl?.getAttribute('value')).toBe('/start')
    })

    it('should return the visitor to an error page served outside the translated routes', async ({
      server
    }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: '/public/no-such-asset'
      })
      const returnUrl = bodyOf(result).querySelector('input[name="returnUrl"]')

      expect(returnUrl?.getAttribute('value')).toBe('/public/no-such-asset')
    })

    it('should return a welsh visitor to the welsh page', async ({
      server
    }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: '/cy/start?page=2'
      })
      const returnUrl = bodyOf(result).querySelector('input[name="returnUrl"]')

      expect(returnUrl?.getAttribute('value')).toBe('/cy/start?page=2')
    })

    it('should name the buttons so the choice reaches the server', async ({
      server
    }) => {
      const body = bodyOf((await getStartPage({ server })).result)
      const choices = body.querySelectorAll('button[name="analytics"]')

      expect(
        Array.from(choices).map((button) => button.getAttribute('value'))
      ).toStrictEqual(['accepted', 'rejected'])
    })

    it('should sit before the skip link, per the design system', async ({
      server
    }) => {
      const body = bodyOf((await getStartPage({ server })).result)
      const inDocumentOrder = body.querySelectorAll(
        '.govuk-cookie-banner, .govuk-skip-link'
      )

      expect(
        Array.from(inDocumentOrder).map((element) => element.className)
      ).toStrictEqual(['govuk-cookie-banner', 'govuk-skip-link'])
    })
  })

  describe('when a choice has just been made from the banner', () => {
    beforeAll(() => {
      config.set('analytics.isEnabled', true)
      config.set('analytics.measurementId', 'G-TESTONLY01')
    })

    afterAll(() => {
      config.set('analytics.isEnabled', false)
      config.set('analytics.measurementId', '')
    })

    it.for([
      { consent: 'accepted', message: "You've accepted analytics cookies." },
      { consent: 'rejected', message: "You've rejected analytics cookies." }
    ])(
      'should confirm the choice having $consent',
      async ({ consent, message }, { server }) => {
        const { cookie } = await answerBanner({ server }, consent)
        const banner = getByRole(
          bodyOf((await getStartPage({ server }, cookie)).result),
          'region',
          { name: /cookies on/i }
        )

        expect(getByRole(banner, 'alert').textContent).toContain(
          `${message} You can change your cookie settings at any time.`
        )
      }
    )

    it('should link to the cookies page to change the choice', async ({
      server
    }) => {
      const { cookie } = await answerBanner({ server }, 'accepted')
      const banner = getByRole(
        bodyOf((await getStartPage({ server }, cookie)).result),
        'region',
        { name: /cookies on/i }
      )

      expect(
        getByRole(banner, 'link', {
          name: 'change your cookie settings'
        }).getAttribute('href')
      ).toBe('/cookies')
    })

    it('should let the visitor hide the message', async ({ server }) => {
      const { cookie } = await answerBanner({ server }, 'accepted')
      const banner = getByRole(
        bodyOf((await getStartPage({ server }, cookie)).result),
        'region',
        { name: /cookies on/i }
      )

      expect(
        getByRole(banner, 'button', {
          name: 'Hide cookie message'
        }).getAttribute('href')
      ).toBe('/start')
    })

    it('should confirm the choice only once', async ({ server }) => {
      const { cookie } = await answerBanner({ server }, 'accepted')
      const { headers } = await getStartPage({ server }, cookie)
      const { result } = await getStartPage(
        { server },
        mergeCookies(
          cookie,
          extractCookieValues(headers['set-cookie']).join('; ')
        )
      )

      expect(
        queryByRole(bodyOf(result), 'region', { name: /cookies on/i })
      ).toBeNull()
    })
  })

  describe('when a choice has already been made', () => {
    beforeAll(() => {
      config.set('analytics.isEnabled', true)
      config.set('analytics.measurementId', 'G-TESTONLY01')
    })

    afterAll(() => {
      config.set('analytics.isEnabled', false)
      config.set('analytics.measurementId', '')
    })

    it.for(['accepted', 'rejected'])(
      'should not render the banner having %s',
      async (consent, { server }) => {
        const { result } = await getStartPage(
          { server },
          `${ANALYTICS_CONSENT_COOKIE}=${consent}`
        )
        const banner = queryByRole(bodyOf(result), 'region', {
          name: /cookies on/i
        })

        expect(banner).toBeNull()
      }
    )
  })
})
