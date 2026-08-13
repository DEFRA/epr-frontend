import { removeUserSession } from '#server/auth/helpers/user-session.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { asHapiRequest } from '#server/common/hapi-types.js'
import { genericErrorViewModel } from '#server/error/generic-error.js'
import { paths } from '#server/paths.js'

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
 * @param { Request } r
 * @param { ResponseToolkit } h
 */
export async function catchAll(r, h) {
  const request = asHapiRequest(r)
  const { response } = request

  if (!('isBoom' in response)) {
    return h.continue
  }

  const statusCode = response.output.statusCode

  if (statusCode === statusCodes.unauthorized) {
    await removeUserSession(request)

    return h.redirect(request.localiseUrl(paths.loggedOut)).takeover()
  }

  // All this knows about a refusal is that a signed in user met one, so the
  // page it renders states no cause. Every route that i18n ignores also sets
  // `auth: false`, so a request that reaches here always carries `request.t`.
  if (statusCode === statusCodes.forbidden && request.auth?.isAuthenticated) {
    return h
      .view('error/no-permission', {
        pageTitle: request.t('error:noPermission:pageTitle')
      })
      .code(statusCode)
      .takeover()
  }

  if (statusCode >= statusCodes.internalServerError) {
    request.logger.error({ err: response })

    if (request.t) {
      return h
        .view(
          'error/generic',
          genericErrorViewModel(request.t, request.localiseUrl('/'))
        )
        .code(statusCode)
    }
  }

  const errorMessage = statusCodeMessage(statusCode, request.t)

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
