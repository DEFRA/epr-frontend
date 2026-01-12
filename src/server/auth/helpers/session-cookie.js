import { config } from '#config/config.js'
import {
  createUpdateUserSession,
  removeUserSession
} from '#server/auth/helpers/user-session.js'
import { err, ok } from '#server/common/helpers/result.js'
import authCookie from '@hapi/cookie'
import { isPast, parseISO, subMinutes } from 'date-fns'
import { getUserSession } from './get-user-session.js'
import { refreshAccessToken } from './refresh-token.js'

/**
 * @import { Request, ServerRegisterPluginObject } from '@hapi/hapi'
 * @import { UserSession } from '../types/session.js'
 * @import { Result } from '#server/common/helpers/result.js'
 * @import { VerifyToken } from '../types/verify-token.js'
 */

/**
 * Create session cookie authentication plugin
 * Factory function that creates a plugin with verifyToken closure
 * @param {VerifyToken} verifyToken - Token verification function
 * @returns {ServerRegisterPluginObject<void>}
 */
const createSessionCookie = (verifyToken) => {
  const updateUserSession = createUpdateUserSession(verifyToken)

  /**
   * Checks if token is expired and refreshes it if needed
   * @param {Request} request - Hapi request object
   * @param {UserSession} userSession - Current user session
   * @returns {Promise<Result<UserSession>>} Result indicating success or failure
   */
  const handleExpiredTokenRefresh = async (request, userSession) => {
    // Check if token will expire in less than 1 minute
    const tokenWillExpireSoon = isPast(
      subMinutes(parseISO(userSession.expiresAt), 1)
    )

    if (!tokenWillExpireSoon) {
      return ok(userSession)
    }

    try {
      const response = await refreshAccessToken(request)

      if (!response.ok) {
        const errorBody = await response.text()
        return err({
          message: 'Failed to refresh session',
          status: response.status,
          body: errorBody
        })
      }

      const refreshAccessTokenJson = await response.json()

      const refreshedSession = await updateUserSession(
        request,
        refreshAccessTokenJson
      )

      return ok(refreshedSession)
    } catch (error) {
      return err({ message: 'Failed to refresh session', cause: error })
    }
  }

  return {
    plugin: {
      name: 'user-session',
      register: async (server) => {
        await server.register(authCookie)

        server.auth.strategy('session', 'cookie', {
          cookie: {
            name: 'userSession',
            path: '/',
            password: config.get('session.cookie.password'),
            isSecure: config.get('session.cookie.secure'),
            ttl: config.get('session.cookie.ttl')
          },
          keepAlive: true,
          /**
           * Validates the session cookie on each request
           * @param {Request} request - Hapi request object
           * @param {UserSession} session - Session data from cookie
           * @returns {Promise<{isValid: boolean, credentials?: UserSession}>} Validation result
           */
          validate: async (request, session) => {
            const { ok: hasSession, value: userSession } =
              await getUserSession(request)
            if (!hasSession) {
              return { isValid: false }
            }

            const { ok: refreshOk, error } = await handleExpiredTokenRefresh(
              request,
              userSession
            )
            if (!refreshOk) {
              request.logger.error(error, error.message)
              removeUserSession(request)

              return { isValid: false }
            }

            const refreshedSession = await server.app.cache.get(
              session.sessionId
            )

            /* v8 ignore else - Extreme edge case: session deleted between first lookup and this second lookup (race condition) */
            if (refreshedSession) {
              return {
                isValid: true,
                credentials: refreshedSession
              }
            } else {
              return { isValid: false }
            }
          }
        })

        server.auth.default('session')
      }
    }
  }
}

export { createSessionCookie }
