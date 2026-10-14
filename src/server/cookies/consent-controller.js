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

    return h
      .redirect(getSafeRedirect(returnUrl))
      .state(ANALYTICS_CONSENT_COOKIE, analytics, {
        ttl: CONSENT_MAX_AGE_DAYS * 24 * 60 * 60 * 1000,
        isHttpOnly: false,
        isSameSite: 'Lax',
        path: '/'
      })
  }
}
