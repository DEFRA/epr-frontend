import { config } from '#config/config.js'
import {
  markSessionAsIdTokenRefreshInProgress,
  removeUserSession,
  updateUserSession
} from '#server/auth/helpers/user-session.js'
import authCookie from '@hapi/cookie'
import { isPast, parseISO, subMinutes, subSeconds } from 'date-fns'
import { getUserSession } from './get-user-session.js'
import { refreshIdToken } from './refresh-token.js'

/**
 * @import { Request, ServerRegisterPluginObject } from '@hapi/hapi'
 * @import { UserSession } from '../types/session.js'
 * @import { VerifyToken } from '../types/verify-token.js'
 */

/**
 * Refreshes id token if it is nearly expired
 * @param {VerifyToken} verifyToken
 * @param {Request} request
 * @param {UserSession} userSession
 */
const refreshIdTokenIfNearlyExpired = async (
  verifyToken,
  request,
  userSession
) => {
  if (userSession.idTokenRefreshInProgress) {
    return
  }

  try {
    await markSessionAsIdTokenRefreshInProgress(request, userSession)
    const response = await refreshIdToken(request)

    if (!response.ok) {
      const errorBody = await response.text()
      throw new Error(errorBody)
    }

    const refreshedTokens = await response.json()
    const { ok: sessionStillExists, value: latestSession } =
      await getUserSession(request)
    if (!sessionStillExists) {
      return // exit without error if session was deleted while refresh was in progress (eg during refresh triggered from /logout page)
    }
    await updateUserSession(
      verifyToken,
      request,
      latestSession,
      refreshedTokens
    )
  } catch (error) {
    request.logger.error({ err: error }, 'Failed to refresh session')
    await removeUserSession(request)
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

            if (isWithin10Seconds(parseISO(userSession.expiresAt))) {
              // Await refresh so the session is updated before this request completes
              await refreshIdTokenIfNearlyExpired(
                verifyToken,
                request,
                userSession
              )
            } else if (isWithin5Minutes(parseISO(userSession.expiresAt))) {
              // Run as background task so the current request is not delayed
              void refreshIdTokenIfNearlyExpired(
                verifyToken,
                request,
                userSession
              )
            } else {
              // Session is valid and not close to expiring, no action needed
            }

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

function isWithin10Seconds(date) {
  return isPast(subSeconds(date, 10))
}

function isWithin5Minutes(date) {
  return isPast(subMinutes(date, 5)) // NOSONAR: 5 is not a magic number in this context, it is a specific time threshold for refreshing the token
}

export { createSessionCookie }
