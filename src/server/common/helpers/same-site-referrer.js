import { withoutLanguagePrefix } from '#server/common/helpers/language-prefix.js'
import { isSafeRedirect } from '#utils/get-safe-redirect.js'

/**
 * @import { HapiRequest } from '#server/common/hapi-types.js'
 */

/**
 * The page on this service the visitor followed a link from, as a path and
 * query to send them back to. Null when they came from another site, from
 * nowhere, or from the page they are now on, in either language.
 * @param {HapiRequest} request
 * @returns {string | null}
 */
export const sameSiteReferrer = (request) => {
  const referrer = URL.parse(request.info.referrer)

  if (
    referrer?.host !== request.info.host ||
    withoutLanguagePrefix(referrer.pathname) === request.path
  ) {
    return null
  }

  const path = `${referrer.pathname}${referrer.search}`

  return isSafeRedirect(path) ? path : null
}
