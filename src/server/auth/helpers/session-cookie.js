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
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 * @import { HapiRequest } from '#server/common/hapi-types.js'
 * @import { RefreshedTokens } from '../types/tokens.js'
 * @import { UserSession } from '../types/session.js'
 * @import { VerifyToken } from '../types/verify-token.js'
 */

/**
 * @param {'blocking' | 'background'} type
 * @param {{ outcome?: 'success' | 'failure' }} [extras]
 * @returns {{ action: string, type: string, kind: string, outcome?: string }}
 */
const tokenRefreshEvent = (type, extras = {}) => ({
  action: 'token-refresh',
  type,
  kind: 'event',
  ...extras
})

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
 * @returns {(request: HapiRequest, userSession: UserSession) => Promise<UserSession | null>}
 */
const createRefreshIdTokenAndUpdateSession = (verifyToken) => {
  /** @type {ReturnType<typeof createRefreshIdTokenAndUpdateSession>} */
  const refreshIdTokenAndUpdateSession = async (request, userSession) => {
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

      const refreshedTokens = /** @type {RefreshedTokens} */ (
        await response.json()
      )
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

  return refreshIdTokenAndUpdateSession
}

/**
 * @param {VerifyToken} verifyToken
 * @returns {(request: HapiRequest, userSession: UserSession) => Promise<{isValid: boolean, credentials?: UserSession}>}
 */
const createBlockingRefresh = (verifyToken) => {
  const refreshIdTokenAndUpdateSession =
    createRefreshIdTokenAndUpdateSession(verifyToken)

  /** @type {ReturnType<typeof createBlockingRefresh>} */
  const blockingRefresh = async (request, userSession) => {
    const refreshedSession = await request
      .metrics()
      .timer(
        'tokenRefreshDuration',
        () => refreshIdTokenAndUpdateSession(request, userSession),
        { type: 'blocking' }
      )

    request.logger.info(
      {
        event: tokenRefreshEvent('blocking', {
          outcome: refreshedSession ? 'success' : 'failure'
        })
      },
      'Token refresh complete (blocking)'
    )

    return refreshedSession
      ? { isValid: true, credentials: refreshedSession }
      : { isValid: false }
  }

  return blockingRefresh
}

/**
 * @param {VerifyToken} verifyToken
 * @returns {(request: HapiRequest, userSession: UserSession) => void}
 */
const createBackgroundRefresh = (verifyToken) => {
  const refreshIdTokenAndUpdateSession =
    createRefreshIdTokenAndUpdateSession(verifyToken)

  /** @type {ReturnType<typeof createBackgroundRefresh>} */
  const backgroundRefresh = (request, userSession) => {
    const run = async () => {
      const refreshedSession = await request
        .metrics()
        .timer(
          'tokenRefreshDuration',
          () => refreshIdTokenAndUpdateSession(request, userSession),
          { type: 'background' }
        )

      request.logger.info(
        {
          event: tokenRefreshEvent('background', {
            outcome: refreshedSession ? 'success' : 'failure'
          })
        },
        'Token refresh complete (background)'
      )
    }

    // fire-and-forget: deliberately not awaited so the current request is not delayed
    void run()
  }

  return backgroundRefresh
}

/**
 * Create session cookie authentication plugin
 * Factory function that creates a plugin with verifyToken closure
 * @param {VerifyToken} verifyToken - Token verification function
 * @returns {ServerRegisterPluginObject<void>}
 */
const createSessionCookie = (verifyToken) => {
  const blockingRefresh = createBlockingRefresh(verifyToken)
  const backgroundRefresh = createBackgroundRefresh(verifyToken)

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
           * @param {HapiRequest} request - Hapi request object
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
              return blockingRefresh(request, userSession)
            } else if (userSessionExpires(userSession, inNext5Minutes)) {
              backgroundRefresh(request, userSession)
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
