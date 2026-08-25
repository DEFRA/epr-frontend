import { statusCodes } from '#server/common/constants/status-codes.js'
import { ANALYTICS_CONSENT_COOKIE } from '#server/common/helpers/analytics/consent.js'
import { getCsrfToken } from '#server/common/test-helpers/csrf-helper.js'
import { it } from '#vite/fixtures/server.js'
import { describe, expect } from 'vitest'

/**
 * @import { HapiServer } from '#server/common/hapi-types.js'
 */

/**
 * @param {HapiServer} server
 * @param {Record<string, string>} payload
 */
const postConsent = async (server, payload) => {
  const { cookie, crumb } = await getCsrfToken(server, '/start')

  return server.inject({
    method: 'POST',
    url: '/cookies/consent',
    headers: { cookie },
    payload: { crumb, ...payload }
  })
}

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

  it.for(['//evil.example.com', 'https://evil.example.com', 'not-a-path'])(
    'should refuse to redirect off-site to %s',
    async (returnUrl, { server }) => {
      const { headers } = await postConsent(server, {
        analytics: 'accepted',
        returnUrl
      })

      expect(headers.location).toBe('/')
    }
  )

  it('should reject a choice it does not recognise', async ({ server }) => {
    const { statusCode } = await postConsent(server, {
      analytics: 'maybe',
      returnUrl: '/start'
    })

    expect(statusCode).toBe(statusCodes.badRequest)
  })
})
