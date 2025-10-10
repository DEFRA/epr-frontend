import { statusCodes } from '~/src/server/common/constants/status-codes.js'

/**
 * @param {number} statusCode
 */
function statusCodeMessage(statusCode, localize) {
  console.log('localize: ', localize)
  switch (statusCode) {
    case statusCodes.notFound:
      return localize('errors').notFound
    case statusCodes.forbidden:
      return localize('errors').forbidden
    case statusCodes.unauthorized:
      return localize('errors').unauthorized
    case statusCodes.badRequest:
      return localize('errors').badRequest
    default:
      return localize('errors').generic
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
  const localize =
    request.localize || request?.i18n?.__.bind(request.i18n) || ((key) => key)

  const errorMessage = statusCodeMessage(statusCode, localize)
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
