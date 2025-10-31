import { statusCodes } from '#server/common/constants/status-codes.js'

/**
 * @param {number} statusCode
 */
function statusCodeMessage(statusCode, localise) {
  switch (statusCode) {
    case statusCodes.notFound:
      return localise('error:notFound')
    case statusCodes.forbidden:
      return localise('error:forbidden')
    case statusCodes.unauthorized:
      return localise('error:unauthorized')
    case statusCodes.badRequest:
      return localise('error:badRequest')
    default:
      return localise('error:generic')
  }
}

/**
 * @param { Request } request
 * @param { ResponseToolkit } h
 */
export function catchAll(request, h) {
  const { response } = request

  if (!('isBoom' in response)) {
    return h.continue
  }

  const statusCode = response.output.statusCode

  // If i18n is not available (e.g., for static assets), return the boom response
  if (!request.t) {
    return h.continue
  }

  const errorMessage = statusCodeMessage(statusCode, request.t)

  if (statusCode >= statusCodes.internalServerError) {
    request.logger.error(response?.stack)
  }

  return h
    .view('error/index', {
      pageTitle: errorMessage,
      heading: statusCode,
      message: errorMessage
    })
    .code(statusCode)
}

/**
 * @import { Request, ResponseToolkit } from '@hapi/hapi'
 */
