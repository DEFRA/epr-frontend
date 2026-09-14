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

const THIRTY_DAYS_IN_MILLISECONDS = 30 * 24 * 60 * 60 * 1000

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

/**
 * The signed-out page for a user who holds no session. The cookie grants
 * nothing, so a forged one buys only the other page. The flag is read because
 * the regulator page is registered only when it is on.
 * @param {HapiRequest} request
 * @returns {string}
 */
export const signedOutPage = (request) =>
  config.get('featureFlags.regulatorAccess') &&
  request.state[SIGN_IN_PROVIDER_COOKIE] === OIDC_ENTRA_ID
    ? paths.regulators.loggedOut
    : paths.loggedOut
