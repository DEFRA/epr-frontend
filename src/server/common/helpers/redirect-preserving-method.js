import { statusCodes } from '#server/common/constants/status-codes.js'
import { isReadMethod } from '#server/common/helpers/http-methods.js'

/**
 * @import { ResponseToolkit } from '@hapi/hapi'
 * @import { HapiRequest } from '#server/common/hapi-types.js'
 */

/**
 * Redirects to the path in the request's language, keeping its query string.
 * A read is a 302; anything else is a 307, so the browser resends its body.
 * @param {HapiRequest} request
 * @param {ResponseToolkit} h
 * @param {string} path
 */
export const redirectPreservingMethod = (request, h, path) =>
  h
    .redirect(request.localiseUrl(`${path}${request.url.search}`))
    .code(
      isReadMethod(request.method)
        ? statusCodes.found
        : statusCodes.temporaryRedirect
    )
