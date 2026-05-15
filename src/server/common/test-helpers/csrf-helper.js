/**
 * @import { HapiServer } from '#server/common/hapi-types.js'
 */

/**
 * Get CSRF token for testing
 * @param {HapiServer} server - Hapi server instance
 * @param {string} getUrl - URL to GET to obtain CSRF token
 * @param {object} [options] - Optional request options
 * @param {object} [options.auth] - Optional auth credentials for the request
 * @param {object} [options.headers] - Optional headers to include in the request
 * @returns {Promise<{cookie: string, crumb: string}>}
 */
export async function getCsrfToken(server, getUrl, options = {}) {
  const response = await server.inject({
    method: 'GET',
    url: getUrl,
    ...options
  })
  const setCookie = response.headers['set-cookie']
  const cookies = Array.isArray(setCookie) ? setCookie : [setCookie]
  const crumbCookie = cookies.find(
    (cookie) => cookie?.startsWith('crumb=') ?? false
  )
  if (!crumbCookie) throw new Error('No crumb cookie found')
  const crumbValue = crumbCookie.split(';')[0].split('=')[1]
  // Preserve all cookies from the response (e.g., session + crumb)
  // to accurately represent multi-cookie scenarios in tests
  const cookieHeader = cookies
    .filter(/** @returns {c is string} */ (c) => Boolean(c))
    .map((c) => c.split(';')[0])
    .join('; ')
  return { cookie: cookieHeader, crumb: crumbValue }
}
