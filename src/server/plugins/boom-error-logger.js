import { statusCodes } from '#server/common/constants/status-codes.js'
import {
  loggingEventActions,
  loggingEventCategories
} from '#server/common/enums/event.js'

/**
 * @import { ResponseToolkit, Server } from '@hapi/hapi'
 * @import { HapiRequest } from '#server/common/hapi-types.js'
 * @import { CdpBoom } from '#server/common/helpers/logging/cdp-boom.js'
 */

const SERVER_ERROR_THRESHOLD = 500

export const boomErrorLogger = {
  plugin: {
    name: 'boom-error-logger',
    version: '1.0.0',
    /** @param {Server} server */
    register: (server) => {
      server.ext(
        'onPreResponse',
        /**
         * @param {HapiRequest} request
         * @param {ResponseToolkit} h
         */
        (request, h) => {
          const response = request.response

          if (!('isBoom' in response) || !response.isBoom) {
            return h.continue
          }

          const boom = /** @type {CdpBoom} */ (response)
          const statusCode = boom.output.statusCode

          // 401 is already handled by errors.js catchAll which clears the
          // session and redirects to /logged-out — skip to avoid noise.
          if (statusCode === statusCodes.unauthorized) {
            return h.continue
          }

          const isServerError = statusCode >= SERVER_ERROR_THRESHOLD
          const level = isServerError ? 'error' : 'warn'
          const defaultAction = isServerError
            ? loggingEventActions.responseFailure
            : loggingEventActions.requestFailure

          // Boom messages are PII-safe by convention. We do not read
          // boom.output.payload (Joi validation echoes input), boom.data
          // (arbitrary developer-attached payload), or boom.stack (the first
          // line of a stack trace echoes the error message, which can leak
          // PII when an upstream Error was constructed from user input).
          //
          // Helpers may enrich a Boom with `code` (semantic classifier) and
          // `event` fields (action/reason/reference) for indexed search — see
          // CdpBoom. These override the defaults when present.
          request.logger[level]({
            message: boom.message,
            error: {
              code: boom.code ?? String(statusCode),
              id: request.info.id,
              message: boom.message,
              type: boom.output.payload.error
            },
            event: {
              category: loggingEventCategories.http,
              action: defaultAction,
              kind: 'event',
              outcome: 'failure',
              ...(boom.event ?? {})
            },
            http: {
              response: {
                status_code: statusCode
              }
            }
          })

          return h.continue
        }
      )
    }
  }
}
