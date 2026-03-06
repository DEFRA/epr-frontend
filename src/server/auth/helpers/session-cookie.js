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

function userSessionExpires(userSession, isInTimeframe) {
  return isInTimeframe(parseISO(userSession.expiresAt))
}

function inNext10Seconds(date) {
  return isPast(subSeconds(date, 10)) // NOSONAR: 10 is not a magic number in this context, it is a specific time threshold for refreshing the token
}

function inNext5Minutes(date) {
  return isPast(subMinutes(date, 5)) // NOSONAR: 5 is not a magic number in this context, it is a specific time threshold for refreshing the token
}

/**
 * Refreshes id token and updates session with refreshed tokens. If the refresh fails, the session is removed.
 * @param {VerifyToken} verifyToken
 * @param {Request} request
 * @param {UserSession} userSession
 * @returns {Promise<UserSession | null>}
 */
const refreshIdTokenAndUpdateSession = async (
  verifyToken,
  request,
  userSession
) => {
  if (userSession.idTokenRefreshInProgress) {
    return userSession
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
      return null // exit without error if session was deleted while refresh was in progress (eg during background refresh triggered from /logout page)
    }
    return await updateUserSession(
      verifyToken,
      request,
      latestSession,
      refreshedTokens
    )
  } catch (error) {
    request.logger.error({ err: error }, 'Failed to refresh session')
    await removeUserSession(request)
    return null
  }
}

/**
 * @param {VerifyToken} verifyToken
 * @param {Request} request
 * @param {UserSession} userSession
 * @returns {Promise<{isValid: boolean, credentials?: UserSession}>}
 */
const blockingRefresh = async (verifyToken, request, userSession) => {
  const spanId = crypto.randomUUID()
  request.logger.info(
    {
      event: { action: 'token-refresh', type: 'blocking', kind: 'event' },
      span: { id: spanId }
    },
    'Token refresh start (blocking)'
  )
  const t0 = performance.now()
  const refreshedSession = await refreshIdTokenAndUpdateSession(
    verifyToken,
    request,
    userSession
  )
  request.logger.info(
    {
      event: {
        action: 'token-refresh',
        type: 'blocking',
        outcome: refreshedSession ? 'success' : 'failure',
        duration: performance.now() - t0,
        kind: 'event'
      },
      span: { id: spanId }
    },
    'Token refresh complete (blocking)'
  )
  return refreshedSession
    ? { isValid: true, credentials: refreshedSession }
    : { isValid: false }
}

/**
 * @param {VerifyToken} verifyToken
 * @param {Request} request
 * @param {UserSession} userSession
 */
const backgroundRefresh = (verifyToken, request, userSession) => {
  const spanId = crypto.randomUUID()
  request.logger.info(
    {
      event: { action: 'token-refresh', type: 'background', kind: 'event' },
      span: { id: spanId }
    },
    'Token refresh start (background)'
  )
  void (async () => {
    const t0 = performance.now()
    const refreshedSession = await refreshIdTokenAndUpdateSession(
      verifyToken,
      request,
      userSession
    )
    request.logger.info(
      {
        event: {
          action: 'token-refresh',
          type: 'background',
          outcome: refreshedSession ? 'success' : 'failure',
          duration: performance.now() - t0,
          kind: 'event'
        },
        span: { id: spanId }
      },
      'Token refresh complete (background)'
    )
  })()
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

            // Note this first check also catches an expired session
            if (userSessionExpires(userSession, inNext10Seconds)) {
              return blockingRefresh(verifyToken, request, userSession)
            } else if (userSessionExpires(userSession, inNext5Minutes)) {
              backgroundRefresh(verifyToken, request, userSession)
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

export { createSessionCookie }
