import { config } from '#config/config.js'
import { OIDC_ENTRA_ID } from '#server/auth/plugins/entra-id.js'
import { paths } from '#server/paths.js'

/**
 * @import { ResponseToolkit } from '@hapi/hapi'
 * @import { HapiRequest, HapiServer } from '#server/common/hapi-types.js'
 */

/**
 * Remembers that a browser last signed in as a regulator. It outlives the
 * session, so the service can still tell once the session has gone.
 */
export const SIGN_IN_PROVIDER_COOKIE = 'signInProvider'

const THIRTY_DAYS_IN_MILLISECONDS = 2592000000

/**
 * `Lax`, so the cookie is sent when the provider redirects back after sign out.
 * @param {HapiServer} server
 */
export const registerSignInProviderCookie = (server) => {
  server.state(SIGN_IN_PROVIDER_COOKIE, {
    clearInvalid: true,
    ignoreErrors: true,
    isHttpOnly: true,
    isSameSite: 'Lax',
    isSecure: config.get('session.cookie.secure'),
    path: '/',
    ttl: THIRTY_DAYS_IN_MILLISECONDS
  })
}

/**
 * Only a regulator is remembered, so an operator is given no cookie.
 * @param {ResponseToolkit} h
 * @param {string} provider
 */
export const rememberSignInProvider = (h, provider) => {
  if (provider === OIDC_ENTRA_ID) {
    h.state(SIGN_IN_PROVIDER_COOKIE, provider)
  }
}

/**
 * An operator signing in on a browser a regulator used is an operator from
 * then on.
 * @param {ResponseToolkit} h
 */
export const forgetSignInProvider = (h) => {
  h.unstate(SIGN_IN_PROVIDER_COOKIE)
}

const PROVIDER_ID_PATTERN = /^[a-z0-9-]{1,32}$/

/**
 * @param {unknown} value
 * @returns {string}
 */
const describeProviderValue = (value) =>
  typeof value === 'string' && PROVIDER_ID_PATTERN.test(value)
    ? value
    : 'invalid'

/**
 * The cookie is writable by the browser, so only a value shaped like a
 * provider id is logged as itself. A cookie sent twice arrives as an array.
 * @param {unknown} value
 * @returns {string}
 */
const describeProviderCookie = (value) => {
  if (value === undefined) {
    return 'absent'
  }
  return Array.isArray(value)
    ? `duplicate(${value.map(describeProviderValue).join(',')})`
    : describeProviderValue(value)
}

/**
 * The parsed state is empty both when no cookie was sent and when one was sent
 * that could not be unsealed, so the raw header tells the two apart.
 * @param {HapiRequest} request
 * @returns {'absent' | 'present' | 'unreadable'}
 */
const describeSessionCookie = (request) => {
  const sent = String(request.headers.cookie ?? '')
    .split(';')
    .some((cookie) => cookie.trim().startsWith('userSession='))
  if (!sent) {
    return 'absent'
  }
  return request.state.userSession ? 'present' : 'unreadable'
}

/**
 * The signed-out page for a user who holds no session, and what led to it. The
 * cookie grants nothing, so a forged one buys only the other page. The flag is
 * read because the regulator page is registered only when it is on. The reason
 * gives the provider cookie's value when it is shaped like a provider id, and
 * whether the session cookie arrived.
 * @param {HapiRequest} request
 * @returns {{ page: string, reason: string }}
 */
export const signedOutPage = (request) => {
  const cookieValue = request.state[SIGN_IN_PROVIDER_COOKIE]
  const isRegulator =
    config.get('featureFlags.regulatorAccess') && cookieValue === OIDC_ENTRA_ID
  const providerCookie = describeProviderCookie(cookieValue)
  const sessionCookie = describeSessionCookie(request)

  return {
    page: isRegulator ? paths.regulators.loggedOut : paths.loggedOut,
    reason: `signInProvider cookie ${providerCookie}, session cookie ${sessionCookie}`
  }
}

/**
 * Sends a user who holds no session to the signed-out page, logging why.
 * @param {HapiRequest} request
 * @param {ResponseToolkit} h
 */
export const redirectToSignedOut = (request, h) => {
  const { page, reason } = signedOutPage(request)

  request.logger.info({
    message: 'Signed-out redirect',
    event: {
      action: 'signed-out-redirect',
      kind: 'event',
      outcome: 'success',
      reason,
      reference: page
    }
  })

  return h.redirect(request.localiseUrl(page))
}
