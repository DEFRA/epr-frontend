import {
  ANALYTICS_CONSENT,
  ANALYTICS_CONSENT_COOKIE,
  ANALYTICS_CONSENT_SESSION_KEY
} from '#server/common/analytics/consent.js'
import { BACK_URL_SESSION_KEY } from '#server/cookies/controller.js'
import { getSafeRedirect, isSafeRedirect } from '#utils/get-safe-redirect.js'
import Joi from 'joi'

/**
 * @import { ResponseToolkit } from '@hapi/hapi'
 * @import { AnalyticsConsent } from '#server/common/analytics/consent.js'
 * @import { HapiRequest, HapiServerRoute } from '#server/common/hapi-types.js'
 */

const CONSENT_MAX_AGE_DAYS = 365

const MEASUREMENT_COOKIE = /^_ga(_.+)?$/

/**
 * The browser does not say which domain a cookie it sends was written to, and
 * the measurement library may have written it to any domain above this host,
 * so each is expired. A browser ignores an expiry for a domain it could never
 * have been written to.
 * @param {string} hostname
 */
const domainsAbove = (hostname) => {
  const labels = hostname.split('.')

  return labels
    .slice(1, -1)
    .map((_, index) => labels.slice(index + 1).join('.'))
}

/**
 * @param {HapiRequest} request
 */
const expiredMeasurementCookies = (request) => {
  const domains = domainsAbove(request.info.hostname)

  return Object.keys(request.state)
    .filter((name) => MEASUREMENT_COOKIE.test(name))
    .flatMap((name) => [
      `${name}=; Max-Age=0; Path=/`,
      ...domains.map(
        (domain) => `${name}=; Max-Age=0; Path=/; Domain=${domain}`
      )
    ])
}

/** @satisfies {Partial<HapiServerRoute<HapiRequest>>} */
export const consentController = {
  options: {
    auth: false,
    validate: {
      payload: Joi.object({
        analytics: Joi.string()
          .valid(...Object.values(ANALYTICS_CONSENT))
          .required(),
        backUrl: Joi.string().optional(),
        returnUrl: Joi.string().optional(),
        crumb: Joi.string().optional()
      })
    }
  },
  /**
   * @param {HapiRequest & {
   *   payload: { analytics: AnalyticsConsent, backUrl?: string, returnUrl?: string }
   * }} request
   * @param {ResponseToolkit} h
   */
  handler(request, h) {
    const { analytics, backUrl, returnUrl } = request.payload

    request.yar.set(ANALYTICS_CONSENT_SESSION_KEY, analytics)

    if (isSafeRedirect(backUrl)) {
      request.yar.set(BACK_URL_SESSION_KEY, backUrl)
    }

    const response = h
      .redirect(getSafeRedirect(returnUrl))
      .state(ANALYTICS_CONSENT_COOKIE, analytics, {
        ttl: CONSENT_MAX_AGE_DAYS * 24 * 60 * 60 * 1000,
        isHttpOnly: false,
        isSameSite: 'Lax',
        path: '/'
      })

    if (analytics === ANALYTICS_CONSENT.rejected) {
      expiredMeasurementCookies(request).forEach((expiry) =>
        response.header('set-cookie', expiry, { append: true })
      )
    }

    return response
  }
}
