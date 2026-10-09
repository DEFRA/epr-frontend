import {
  ANALYTICS_CONSENT,
  ANALYTICS_CONSENT_COOKIE,
  ANALYTICS_CONSENT_FLASH
} from '#server/common/analytics/consent.js'
import Joi from 'joi'

/**
 * @import { ResponseToolkit } from '@hapi/hapi'
 * @import { HapiRequest, HapiServerRoute } from '#server/common/hapi-types.js'
 */

const CONSENT_MAX_AGE_DAYS = 365

/**
 * A protocol-relative URL is still off-site, so a leading slash alone is not
 * enough to trust a return path with.
 * @param {string} [returnUrl]
 * @returns {string}
 */
const safeReturnUrl = (returnUrl) =>
  returnUrl?.startsWith('/') && !returnUrl.startsWith('//') ? returnUrl : '/'

/** @satisfies {Partial<HapiServerRoute<HapiRequest>>} */
export const consentController = {
  options: {
    auth: false,
    validate: {
      payload: Joi.object({
        analytics: Joi.string()
          .valid(...Object.values(ANALYTICS_CONSENT))
          .required(),
        returnUrl: Joi.string().optional(),
        crumb: Joi.string().optional()
      })
    }
  },
  /**
   * @param {HapiRequest & { payload: { analytics: string, returnUrl?: string } }} request
   * @param {ResponseToolkit} h
   */
  handler(request, h) {
    const { analytics, returnUrl } = request.payload

    request.yar.flash(ANALYTICS_CONSENT_FLASH, analytics)

    return h
      .redirect(safeReturnUrl(returnUrl))
      .state(ANALYTICS_CONSENT_COOKIE, analytics, {
        ttl: CONSENT_MAX_AGE_DAYS * 24 * 60 * 60 * 1000,
        isHttpOnly: false,
        isSameSite: 'Lax',
        path: '/'
      })
  }
}
