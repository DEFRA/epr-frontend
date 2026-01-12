import { config } from '#config/config.js'
import {
  createUpdateUserSession,
  removeUserSession
} from '#server/auth/helpers/user-session.js'
import { err, ok } from '#server/common/helpers/result.js'
import authCookie from '@hapi/cookie'
import { isPast, parseISO, subMinutes } from 'date-fns'
import { getUserSession } from './get-user-session.js'
import { refreshIdToken } from './refresh-token.js'

/**
 * @import { Request, ServerRegisterPluginObject } from '@hapi/hapi'
 * @import { UserSession } from '../types/session.js'
 * @import { Result } from '#server/common/helpers/result.js'
 * @import { VerifyToken } from '../types/verify-token.js'
 */

/**
 * Creates a handler that checks if token is expired and refreshes it if needed
 * @param {(request: Request, tokenResponse: object) => Promise<UserSession>} updateUserSession
 * @returns {(request: Request, userSession: UserSession) => Promise<Result<UserSession>>}
 */
const createTokenRefreshHandler =
  (updateUserSession) => async (request, userSession) => {
    const tokenWillExpireSoon = isPast(
      subMinutes(parseISO(userSession.expiresAt), 1)
    )

    if (!tokenWillExpireSoon) {
      return ok(userSession)
    }

    try {
      const response = await refreshIdToken(request)

      if (!response.ok) {
        const errorBody = await response.text()
        return err({
          message: 'Failed to refresh session',
          status: response.status,
          body: errorBody
        })
      }

      const refreshIdTokenJson = await response.json()
      const refreshedSession = await updateUserSession(
        request,
        refreshIdTokenJson
      )

      return ok(refreshedSession)
    } catch (error) {
      return err({ message: 'Failed to refresh session', cause: error })
    }
  }

/**
 * Create session cookie authentication plugin
 * Factory function that creates a plugin with verifyToken closure
 * @param {VerifyToken} verifyToken - Token verification function
 * @returns {ServerRegisterPluginObject<void>}
 */
const createSessionCookie = (verifyToken) => {
  const updateUserSession = createUpdateUserSession(verifyToken)
  const handleExpiredTokenRefresh = createTokenRefreshHandler(updateUserSession)

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
            isSameSite: 'Lax',
            ttl: config.get('session.cookie.ttl'),
            clearInvalid: true
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
              await removeUserSession(request)

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
