import {
  extractCookieValues,
  mergeCookies
} from '#server/common/test-helpers/cookie-helper.js'
import { getCsrfToken } from '#server/common/test-helpers/csrf-helper.js'

/**
 * @import { HapiServer } from '#server/common/hapi-types.js'
 */

/**
 * Makes an analytics choice from a page, as a browser would, and returns the
 * cookies to send on the page it is redirected back to.
 * @param {HapiServer} server
 * @param {{ analytics: string, returnUrl: string }} choice
 * @returns {Promise<string>}
 */
export const chooseAnalytics = async (server, { analytics, returnUrl }) => {
  const { cookie, crumb } = await getCsrfToken(server, returnUrl)
  const { headers } = await server.inject({
    method: 'POST',
    url: '/cookies/consent',
    headers: { cookie },
    payload: { analytics, crumb, returnUrl }
  })

  return mergeCookies(
    cookie,
    extractCookieValues(headers['set-cookie']).join('; ')
  )
}
