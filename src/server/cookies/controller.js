import { withoutLanguagePrefix } from '#server/common/helpers/language-prefix.js'
import { BACK_URL_FLASH, localPath } from '#server/cookies/urls.js'

/**
 * @import { ResponseToolkit } from '@hapi/hapi'
 * @import { HapiRequest, HapiServerRoute } from '#server/common/hapi-types.js'
 */

const COOKIES_PAGE = '/cookies'

/**
 * The page the visitor followed a link here from, unless that was this page.
 * @param {HapiRequest} request
 */
const arrivedFrom = (request) => {
  const path = localPath(request.headers.referer, request.url)

  return path &&
    withoutLanguagePrefix(new URL(path, request.url).pathname) !== COOKIES_PAGE
    ? path
    : null
}

/** @satisfies {Partial<HapiServerRoute<HapiRequest>>} */
export const controller = {
  /**
   * @param {HapiRequest} request
   * @param {ResponseToolkit} h
   */
  handler(request, h) {
    return h.view('cookies/index', {
      backUrl: request.yar.flash(BACK_URL_FLASH).at(-1) ?? arrivedFrom(request),
      pageTitle: request.t('cookies:pageTitle')
    })
  }
}
