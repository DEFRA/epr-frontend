/**
 * Get CSRF token for testing
 * @param {Server} server - Hapi server instance
 * @param {string} getUrl - URL to GET to obtain CSRF token
 * @returns {Promise<{cookie: string, crumb: string}>}
 */
export async function getCsrfToken(server, getUrl) {
  const response = await server.inject({ method: 'GET', url: getUrl })
  const setCookie = response.headers['set-cookie']
  const cookies = Array.isArray(setCookie) ? setCookie : [setCookie]
  const crumbCookie = cookies.find((cookie) => cookie.startsWith('crumb='))
  if (!crumbCookie) throw new Error('No crumb cookie found')
  const crumbValue = crumbCookie.split(';')[0].split('=')[1]
  // Preserve all cookies from the response (e.g., session + crumb)
  // to accurately represent multi-cookie scenarios in tests
  const cookieHeader = cookies.map((c) => c.split(';')[0]).join('; ')
  return { cookie: cookieHeader, crumb: crumbValue }
}

/**
 * @import { Server } from '@hapi/hapi'
 */
