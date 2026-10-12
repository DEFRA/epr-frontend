import { sameSiteReferrer } from '#server/common/helpers/same-site-referrer.js'

/**
 * @import { ResponseToolkit } from '@hapi/hapi'
 * @import { HapiRequest, HapiServerRoute } from '#server/common/hapi-types.js'
 */

export const BACK_URL_FLASH = 'cookiesBackUrl'

/** @satisfies {Partial<HapiServerRoute<HapiRequest>>} */
export const controller = {
  /**
   * @param {HapiRequest} request
   * @param {ResponseToolkit} h
   */
  handler(request, h) {
    return h.view('cookies/index', {
      backUrl:
        request.yar.flash(BACK_URL_FLASH).at(-1) ?? sameSiteReferrer(request),
      pageTitle: request.t('cookies:pageTitle')
    })
  }
}
