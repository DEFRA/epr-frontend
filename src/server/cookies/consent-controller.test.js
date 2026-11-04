import { statusCodes } from '#server/common/constants/status-codes.js'
import { ANALYTICS_CONSENT_COOKIE } from '#server/common/analytics/consent.js'
import { getCsrfToken } from '#server/common/test-helpers/csrf-helper.js'
import { it } from '#vite/fixtures/server.js'
import { describe, expect } from 'vitest'

/**
 * @import { HapiServer } from '#server/common/hapi-types.js'
 */

/**
 * @param {HapiServer} server
 * @param {Record<string, string>} payload
 * @param {{ host?: string, sending?: string }} [browser]
 */
const postConsent = async (server, payload, { host, sending } = {}) => {
  const { cookie, crumb } = await getCsrfToken(server, '/start')

  return server.inject({
    method: 'POST',
    url: '/cookies/consent',
    headers: {
      cookie: [cookie, sending].filter(Boolean).join('; '),
      ...(host && { host })
    },
    payload: { crumb, ...payload }
  })
}

/**
 * Each cookie the response expires, with the domain it expires it on, or
 * `host` when it expires the host-only cookie.
 * @param {string | string[] | undefined} setCookie
 */
const expiredBy = (setCookie) =>
  [setCookie ?? []]
    .flat()
    .filter((value) => /;\s*max-age=0(;|$)/i.test(value))
    .map((value) => {
      const [name] = value.split('=')
      const domain = /;\s*domain=([^;]+)/i.exec(value)?.[1] ?? 'host'

      return `${name} on ${domain}`
    })

const analyticsCookies = '_ga=GA1.1.111.222; _ga_TESTONLY01=GS2.1.s333'

/**
 * @param {string | string[] | undefined} setCookie
 */
const analyticsCookieFrom = (setCookie) =>
  [setCookie ?? []]
    .flat()
    .map((value) => value.split(';')[0])
    .find((value) => value.startsWith(`${ANALYTICS_CONSENT_COOKIE}=`))

describe('#cookieConsent', () => {
  it.for(['accepted', 'rejected'])(
    'should record a choice of %s',
    async (analytics, { server }) => {
      const { statusCode, headers } = await postConsent(server, {
        analytics,
        returnUrl: '/start'
      })

      expect(statusCode).toBe(statusCodes.found)
      expect(analyticsCookieFrom(headers['set-cookie'])).toBe(
        `${ANALYTICS_CONSENT_COOKIE}=${analytics}`
      )
    }
  )

  it('should return the user to the page they answered from', async ({
    server
  }) => {
    const { headers } = await postConsent(server, {
      analytics: 'accepted',
      returnUrl: '/cookies'
    })

    expect(headers.location).toBe('/cookies')
  })

  it.for([
    '//evil.example.com',
    '/\\evil.example.com',
    '/\t/evil.example.com',
    'https://evil.example.com',
    'not-a-path'
  ])(
    'should refuse to redirect off-site to %s',
    async (returnUrl, { server }) => {
      const { headers } = await postConsent(server, {
        analytics: 'accepted',
        returnUrl
      })

      expect(headers.location).toBe('/')
    }
  )

  it('should return the user to the start when no page was given', async ({
    server
  }) => {
    const { headers } = await postConsent(server, { analytics: 'accepted' })

    expect(headers.location).toBe('/')
  })

  describe('the analytics cookies already set', () => {
    it('should delete them on this host and every domain above it when analytics is rejected', async ({
      server
    }) => {
      const { headers } = await postConsent(
        server,
        { analytics: 'rejected', returnUrl: '/start' },
        {
          host: 'epr-frontend.test.cdp-int.defra.cloud',
          sending: analyticsCookies
        }
      )

      expect(expiredBy(headers['set-cookie'])).toStrictEqual([
        '_ga on host',
        '_ga on test.cdp-int.defra.cloud',
        '_ga on cdp-int.defra.cloud',
        '_ga on defra.cloud',
        '_ga_TESTONLY01 on host',
        '_ga_TESTONLY01 on test.cdp-int.defra.cloud',
        '_ga_TESTONLY01 on cdp-int.defra.cloud',
        '_ga_TESTONLY01 on defra.cloud'
      ])
    })

    it('should delete them across the whole path, where they were written', async ({
      server
    }) => {
      const { headers } = await postConsent(
        server,
        { analytics: 'rejected', returnUrl: '/start' },
        { host: 'localhost', sending: '_ga=GA1.1.111.222' }
      )

      expect(
        [headers['set-cookie'] ?? []]
          .flat()
          .filter((value) => value.startsWith('_ga='))
      ).toStrictEqual(['_ga=; Max-Age=0; Path=/'])
    })

    it('should still record the rejection alongside deleting them', async ({
      server
    }) => {
      const { headers } = await postConsent(
        server,
        { analytics: 'rejected', returnUrl: '/start' },
        { sending: analyticsCookies }
      )

      expect(analyticsCookieFrom(headers['set-cookie'])).toBe(
        `${ANALYTICS_CONSENT_COOKIE}=rejected`
      )
    })

    it('should keep them when analytics is accepted', async ({ server }) => {
      const { headers } = await postConsent(
        server,
        { analytics: 'accepted', returnUrl: '/start' },
        { sending: analyticsCookies }
      )

      expect(expiredBy(headers['set-cookie'])).toStrictEqual([])
    })

    it('should leave alone cookies that only look like them', async ({
      server
    }) => {
      const { headers } = await postConsent(
        server,
        { analytics: 'rejected', returnUrl: '/start' },
        { sending: '_gat=1; _gallery=x; ga=y' }
      )

      expect(expiredBy(headers['set-cookie'])).toStrictEqual([])
    })
  })

  it('should reject a choice it does not recognise', async ({ server }) => {
    const { statusCode } = await postConsent(server, {
      analytics: 'maybe',
      returnUrl: '/start'
    })

    expect(statusCode).toBe(statusCodes.badRequest)
  })
})
