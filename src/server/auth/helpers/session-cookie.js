import { config } from '#config/config.js'
import {
  updateUserSession,
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
 * Handler that checks if token is expired and refreshes it if needed
 * @param {VerifyToken} verifyToken
 * @param {Request} request
 * @param {UserSession} userSession
 * @returns {Promise<Result<UserSession>>}
 */
const handleExpiredTokenRefresh = async (verifyToken, request, userSession) => {
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
      verifyToken,
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
           * @returns {Promise<{isValid: boolean, credentials?: UserSession}>} Validation result
           */
          validate: async (request) => {
            const { ok: hasSession, value: userSession } =
              await getUserSession(request)
            if (!hasSession) {
              return { isValid: false }
            }

            const {
              ok: refreshOk,
              value: refreshedSession,
              error
            } = await handleExpiredTokenRefresh(
              verifyToken,
              request,
              userSession
            )

            if (!refreshOk) {
              request.logger.error({ err: error }, error.message)
              await removeUserSession(request)

              return { isValid: false }
            }

            return {
              isValid: true,
              credentials: refreshedSession
            }
          }
        })

        server.auth.default('session')
      }
    }
  }
}

export { createSessionCookie }
