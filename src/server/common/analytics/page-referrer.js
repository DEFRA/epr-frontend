import { analyticsStep } from '#server/common/analytics/page-path.js'
import { pathPrefix } from '#server/common/constants/languages.js'

/**
 * @import { HapiRequest } from '#server/common/hapi-types.js'
 */

/**
 * Hapi serves an address matching no route on a wildcard route of its own, so
 * this is the step the page itself reports when it is a not-found page. A
 * referrer matching nothing reports the same one rather than inventing a
 * second name for it.
 */
const NOT_FOUND = '/{p*}'

/**
 * The language prefix is stripped before routing, so a referrer has to be put
 * back into the same shape before it can be matched.
 * @param {string} path
 */
const asRouted = (path) =>
  path === pathPrefix.cy || path.startsWith(`${pathPrefix.cy}/`)
    ? path.slice(pathPrefix.cy.length) || '/'
    : path

/**
 * Names the step the visitor came from, rather than the address they came from.
 *
 * Sanitising the page's own address is not enough: the measurement library
 * reads `document.referrer` when nothing else is published, and on a journey
 * that is the previous page's real address, identifiers and all. The two cases
 * differ, and the answer differs with them. A referrer from another site is how
 * the visitor arrived and carries nothing of ours, so it is left alone. A
 * referrer from this service is resolved back through the routing table to the
 * pattern it would have matched, which is the step without the identifiers.
 * @param {HapiRequest | null} request
 * @returns {string | null} the step, or null to leave the referrer untouched
 */
export const analyticsPageReferrer = (request) => {
  if (!request) {
    return null
  }

  const referer = request.headers?.referer

  if (!referer) {
    return null
  }

  const arrivedFrom = new URL(referer, request.url)

  if (arrivedFrom.host !== request.url.host) {
    return null
  }

  return analyticsStep(
    request.server.match('get', asRouted(arrivedFrom.pathname))?.path ??
      NOT_FOUND
  )
}
