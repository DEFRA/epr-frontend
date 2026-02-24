import { removeUserSession } from '#server/auth/helpers/user-session.js'
import { statusCodes } from '#server/common/constants/status-codes.js'

const statusCodeErrors = {
  [statusCodes.notFound]: {
    code: 'error:notFound',
    fallback: 'Page not found'
  },
  [statusCodes.forbidden]: {
    code: 'error:forbidden',
    fallback: 'Forbidden'
  },
  [statusCodes.unauthorized]: {
    code: 'error:unauthorized',
    fallback: 'Unauthorised'
  },
  [statusCodes.badRequest]: {
    code: 'error:badRequest',
    fallback: 'Bad request'
  }
}

const defaultError = {
  code: 'error:generic',
  fallback: 'Something went wrong'
}

/**
 * @param {number} statusCode
 * @param {(key: string) => string} [localise]
 */
function statusCodeMessage(statusCode, localise) {
  const error = statusCodeErrors[statusCode] || defaultError

  return localise ? localise(error.code) : error.fallback
}

/**
 * @param { Request } request
 * @param { ResponseToolkit } h
 */
export async function catchAll(request, h) {
  const { response } = request

  if (!('isBoom' in response)) {
    return h.continue
  }

  const statusCode = response.output.statusCode

  if (statusCode === statusCodes.unauthorized) {
    await removeUserSession(request)

    return h.redirect(request.localiseUrl('/logged-out')).takeover()
  }

  const errorMessage = statusCodeMessage(statusCode, request.t)

  if (statusCode >= statusCodes.internalServerError) {
    request.logger.error({ err: response })
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
