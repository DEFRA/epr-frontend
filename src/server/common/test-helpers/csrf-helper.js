/**
 * Extract CSRF token from response for testing
 * @param {import('@hapi/hapi').ServerInjectResponse} response from Hapi Server.inject call
 * @returns {Promise<{cookie: string, crumb: string}>}
 */
export function extractCsrfToken(response) {
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
