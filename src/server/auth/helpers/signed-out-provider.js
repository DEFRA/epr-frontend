import { config } from '#config/config.js'
import { OIDC_ENTRA_ID } from '#server/auth/plugins/entra-id.js'

/**
 * @import { ResponseToolkit } from '@hapi/hapi'
 * @import { HapiRequest, HapiServer } from '#server/common/hapi-types.js'
 */

/**
 * Carries which provider signed a user out, from the moment the session still
 * says so to the moment the provider returns them. The session is gone by the
 * time they come back, so the page that greets them cannot ask it who they
 * were.
 */
export const SIGNED_OUT_PROVIDER_COOKIE = 'signedOutProvider'

const TEN_MINUTES_IN_MILLISECONDS = 10 * 60 * 1000

/**
 * The provider sends the user back with a top level navigation from its own
 * origin. A `Strict` cookie is withheld on that navigation and a `Lax` cookie
 * is sent, so `Lax` is what lets the value make the trip. The session cookie
 * crosses the same boundary on the same setting.
 * @param {HapiServer} server
 */
export const registerSignedOutProviderCookie = (server) => {
  server.state(SIGNED_OUT_PROVIDER_COOKIE, {
    clearInvalid: true,
    ignoreErrors: true,
    isHttpOnly: true,
    isSameSite: 'Lax',
    isSecure: config.get('session.cookie.secure'),
    path: '/',
    ttl: TEN_MINUTES_IN_MILLISECONDS
  })
}

/**
 * Records who signed the user out, for the page that greets them when they
 * come back. Only a regulator sign-out is worth remembering, so an operator
 * signing out is given no cookie at all.
 *
 * A refused regulator is written this cookie on a page they may never leave,
 * so the value can outlive the visit that wrote it. An operator sign-out
 * therefore clears the cookie rather than ignoring it, or the operator is
 * greeted by the regulator page for as long as the value survives.
 * @param {ResponseToolkit} h
 * @param {string} provider
 */
export const rememberSignedOutProvider = (h, provider) => {
  if (provider === OIDC_ENTRA_ID) {
    h.state(SIGNED_OUT_PROVIDER_COOKIE, provider)
    return
  }

  h.unstate(SIGNED_OUT_PROVIDER_COOKIE)
}

/**
 * Whether the user who is coming back signed out of the regulator service.
 *
 * Reads the cookie for one thing only: which of two static pages to show. It
 * grants nothing, so a forged value buys a reader the other page and no more.
 * Any value but the one provider gives the operator page, which is what a
 * reader with no cookie gets.
 *
 * The flag is read as well as the cookie, because the page this sends a
 * regulator to is registered only when the flag is on. Without it a forged
 * cookie would send a signing-out operator to an address that does not exist.
 * @param {HapiRequest} request
 * @returns {boolean}
 */
export const signedOutOfRegulatorService = (request) =>
  config.get('featureFlags.regulatorAccess') &&
  request.state[SIGNED_OUT_PROVIDER_COOKIE] === OIDC_ENTRA_ID
