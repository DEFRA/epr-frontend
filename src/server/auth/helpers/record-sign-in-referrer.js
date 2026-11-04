import { asHapiRequest } from '#server/common/hapi-types.js'
import { getRedirectUrl } from './get-redirect-url.js'

/**
 * @import { Request } from '@hapi/hapi'
 */

/**
 * Bell invokes a strategy's `location` function on both legs of the OAuth
 * flow — once to send the user to the identity provider, and again to rebuild
 * the same `redirect_uri` for the token exchange. Only the first leg carries a
 * referrer describing where the user was; on the callback the referrer is the
 * identity provider's own URL.
 * @param {Request} request
 */
const isSignInLeg = (request) => !request.query.code

/**
 * @param {Request} request
 * @param {URL} referrer
 */
const isOwnOrigin = (request, referrer) => {
  const ownOrigin = new URL(getRedirectUrl(asHapiRequest(request), '/')).origin

  return referrer.origin === ownOrigin
}

/**
 * Records the page the user was on before signing in, so the auth callback can
 * return them to it.
 * @param {Request} request
 */
const recordSignInReferrer = (request) => {
  if (!isSignInLeg(request) || !request.info.referrer) {
    return
  }

  const referrer = new URL(request.info.referrer)

  if (
    !isOwnOrigin(request, referrer) ||
    referrer.pathname.startsWith('/auth/callback')
  ) {
    return
  }

  asHapiRequest(request).yar.flash(
    'referrer',
    `${referrer.pathname}${referrer.search}${referrer.hash}`
  )
}

export { recordSignInReferrer }
