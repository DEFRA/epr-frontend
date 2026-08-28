/**
 * @import { HapiRequest } from '#server/common/hapi-types.js'
 */

const PARAMETER = /\{(\w+)(?:\?|\*\d*)?\}/g

/**
 * Names the step a request is on, rather than the address it arrived at.
 *
 * Journey addresses carry organisation, registration and note identifiers, so
 * every operator's copy of one step is a different address. Reporting those
 * would scatter a single funnel step across thousands of values, and would send
 * the identifiers to a third party for no measurement benefit. Hapi already
 * holds the pattern the address matched, which is the step itself.
 *
 * Colons rather than braces because braces are not valid in a path and the
 * result is reported as one.
 * @param {string | undefined} routePath
 * @returns {string}
 */
export const analyticsStep = (routePath) =>
  routePath?.replace(PARAMETER, ':$1') ?? '/'

/**
 * The step the request being served is on.
 * @param {HapiRequest | null} request
 * @returns {string}
 */
export const analyticsPagePath = (request) =>
  analyticsStep(request?.route?.path)
