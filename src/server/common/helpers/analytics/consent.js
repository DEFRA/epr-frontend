import { config } from '#config/config.js'

/**
 * @import { HapiRequest } from '#server/common/hapi-types.js'
 */

export const ANALYTICS_CONSENT_COOKIE = 'analyticsConsent'

export const ANALYTICS_CONSENT = /** @type {const} */ ({
  accepted: 'accepted',
  rejected: 'rejected'
})

/**
 * @param {HapiRequest | null} request
 * @returns {'accepted' | 'rejected' | null}
 */
const readConsent = (request) => {
  const value = request?.state?.[ANALYTICS_CONSENT_COOKIE]

  return value === ANALYTICS_CONSENT.accepted ||
    value === ANALYTICS_CONSENT.rejected
    ? value
    : null
}

/**
 * Whether analytics may run, and whether we still need to ask. Both answers
 * come from one place so a page cannot show the banner while already tracking,
 * or track while still asking. `returnUrl` sends the visitor back to the page
 * they answered from, and is server-built so it is always a local path.
 * @param {HapiRequest | null} request
 * @returns {{ hasConsented: boolean, returnUrl: string, shouldAskConsent: boolean }}
 */
export const analyticsConsent = (request) => {
  const returnUrl = request?.url
    ? `${request.url.pathname}${request.url.search}`
    : '/'

  if (!config.get('analytics.isEnabled')) {
    return { hasConsented: false, returnUrl, shouldAskConsent: false }
  }

  const consent = readConsent(request)

  return {
    hasConsented: consent === ANALYTICS_CONSENT.accepted,
    returnUrl,
    shouldAskConsent: consent === null
  }
}
