import { isAnalyticsEnabled } from '#server/common/analytics/enabled.js'

/**
 * @import { ResponseToolkit } from '@hapi/hapi'
 * @import { HapiRequest } from '#server/common/hapi-types.js'
 */

export const ANALYTICS_CONSENT_COOKIE = 'analyticsConsent'

export const ANALYTICS_CONSENT = /** @type {const} */ ({
  accepted: 'accepted',
  rejected: 'rejected'
})

export const ANALYTICS_CONSENT_FLASH = 'analyticsConsentChoice'

/**
 * @param {unknown} value
 * @returns {'accepted' | 'rejected' | null}
 */
const asConsent = (value) =>
  value === ANALYTICS_CONSENT.accepted || value === ANALYTICS_CONSENT.rejected
    ? value
    : null

/**
 * @param {HapiRequest | null} request
 */
const readConsent = (request) =>
  asConsent(request?.state?.[ANALYTICS_CONSENT_COOKIE])

/**
 * Vision marks the responses it renders with a variety hapi's typings omit.
 * @param {HapiRequest['response']} response
 */
const isView = (response) =>
  /** @type {{ variety?: string }} */ (response).variety === 'view'

/**
 * Consumes the choice made on the previous request so only the next page
 * confirms it. Runs before yar saves the session, which a view's context is
 * built too late to do.
 * @param {HapiRequest} request
 * @param {ResponseToolkit} h
 */
export const takeConfirmedChoice = (request, h) => {
  if (isView(request.response)) {
    request.app.analyticsConfirmedChoice = asConsent(
      request.yar.flash(ANALYTICS_CONSENT_FLASH).at(-1)
    )
  }

  return h.continue
}

/**
 * The page being rendered, in the visitor's language.
 * @param {HapiRequest | null} request
 */
const currentPage = (request) => {
  if (!request?.url) {
    return '/'
  }

  const path = `${request.url.pathname}${request.url.search}`

  return request.localiseUrl?.(path) ?? path
}

/**
 * Whether analytics may run, and whether we still need to ask. Every answer
 * comes from one place so a page cannot show the banner while already tracking,
 * or track while still asking. `hasRejected` is not the negation of
 * `hasConsented`: a visitor who has answered nothing has neither. `returnUrl`
 * sends the visitor back to the page they answered from, and is server-built so
 * it is always a local path.
 * @param {HapiRequest | null} request
 * @returns {{
 *   confirmedChoice: 'accepted' | 'rejected' | null,
 *   hasConsented: boolean,
 *   hasRejected: boolean,
 *   isEnabled: boolean,
 *   returnUrl: string,
 *   shouldAskConsent: boolean
 * }}
 */
export const analyticsConsent = (request) => {
  const returnUrl = currentPage(request)

  if (!isAnalyticsEnabled()) {
    return {
      confirmedChoice: null,
      hasConsented: false,
      hasRejected: false,
      isEnabled: false,
      returnUrl,
      shouldAskConsent: false
    }
  }

  const consent = readConsent(request)

  return {
    confirmedChoice: request?.app?.analyticsConfirmedChoice ?? null,
    hasConsented: consent === ANALYTICS_CONSENT.accepted,
    hasRejected: consent === ANALYTICS_CONSENT.rejected,
    isEnabled: true,
    returnUrl,
    shouldAskConsent: consent === null
  }
}
