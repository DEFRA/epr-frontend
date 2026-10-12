import {
  ANALYTICS_CONSENT,
  ANALYTICS_CONSENT_COOKIE,
  ANALYTICS_CONSENT_FLASH
} from '#server/common/analytics/consent.js'
import { BACK_URL_FLASH } from '#server/cookies/controller.js'
import { getSafeRedirect, isSafeRedirect } from '#utils/get-safe-redirect.js'
import Joi from 'joi'

/**
 * @import { ResponseToolkit } from '@hapi/hapi'
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
   *   payload: { analytics: string, backUrl?: string, returnUrl?: string }
   * }} request
   * @param {ResponseToolkit} h
   */
  handler(request, h) {
    const { analytics, backUrl, returnUrl } = request.payload

    request.yar.flash(ANALYTICS_CONSENT_FLASH, analytics)

    if (isSafeRedirect(backUrl)) {
      request.yar.flash(BACK_URL_FLASH, backUrl)
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
