import { config } from '#config/config.js'
import {
  markSessionAsIdTokenRefreshInProgress,
  removeUserSession,
  updateUserSession
} from '#server/auth/helpers/user-session.js'
import authCookie from '@hapi/cookie'
import { isPast, parseISO, subMinutes } from 'date-fns'
import { getUserSession } from './get-user-session.js'
import { refreshIdToken } from './refresh-token.js'

/**
 * @import { Request, ServerRegisterPluginObject } from '@hapi/hapi'
 * @import { UserSession } from '../types/session.js'
 * @import { VerifyToken } from '../types/verify-token.js'
 */

/**
 * Schedules a background id token refresh if the token is expiring soon.
 * Returns immediately; the refresh updates the user session asynchronously.
 * @param {VerifyToken} verifyToken
 * @param {Request} request
 * @param {UserSession} userSession
 */
const scheduleTokenRefresh = (verifyToken, request, userSession) => {
  const tokenWillExpireSoon = isPast(
    subMinutes(parseISO(userSession.expiresAt), 1)
  )

  if (!tokenWillExpireSoon || userSession.idTokenRefreshInProgress) {
    return
  }

  markSessionAsIdTokenRefreshInProgress(request, userSession)
    .then(() => refreshIdToken(request))
    .then(async (response) => {
      if (!response.ok) {
        const errorBody = await response.text()
        request.logger.error(
          { err: new Error(errorBody) },
          'Failed to refresh session'
        )
        await removeUserSession(request)
        return
      }

      const refreshedTokens = await response.json()
      const { ok: sessionStillExists } = await getUserSession(request)
      if (!sessionStillExists) {
        return
      }
      await updateUserSession(verifyToken, request, refreshedTokens)
    })
    .catch(async (error) => {
      request.logger.error({ err: error }, 'Failed to refresh session')
      await removeUserSession(request)
    })
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

            scheduleTokenRefresh(verifyToken, request, userSession)

            return {
              isValid: true,
              credentials: userSession
            }
          }
        })

        server.auth.default('session')
      }
    }
  }
}

export { createSessionCookie }
