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
import { validateRefreshedTokens } from './refreshed-tokens-schema.js'
import { selectAuthProvider } from './select-auth-provider.js'

/**
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 * @import { HapiRequest } from '#server/common/hapi-types.js'
 * @import { AuthProviders } from '../types/auth-provider.js'
 * @import { UserSession } from '../types/session.js'
 */

/**
 * Name of the strategy that authenticates a request from the session cookie.
 * A request authenticated by any other strategy carries credentials from a
 * sign-in callback, not from a session.
 */
export const SESSION_STRATEGY = 'session'

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
 * Refreshes the session's tokens and updates the session with them. If the
 * refresh fails, the session is removed.
 * @param {AuthProviders} authProviders
 * @returns {(request: HapiRequest, userSession: UserSession) => Promise<UserSession | null>}
 */
const createRefreshIdTokenAndUpdateSession = (authProviders) => {
  /** @type {ReturnType<typeof createRefreshIdTokenAndUpdateSession>} */
  const refreshIdTokenAndUpdateSession = async (request, userSession) => {
    if (userSession.idTokenRefreshInProgress) {
      return userSession
    }

    try {
      await markSessionAsIdTokenRefreshInProgress(request, userSession)

      const authProvider = selectAuthProvider(
        authProviders,
        userSession.provider
      )

      const response = await refreshIdToken(request, authProvider)

      if (!response.ok) {
        const errorBody = await response.text()
        throw new Error(errorBody)
      }

      const refreshedTokens = validateRefreshedTokens(await response.json())
      const { ok: sessionStillExists, value: latestSession } =
        await getUserSession(request)

      if (!sessionStillExists) {
        return null // exit without error if session was deleted while refresh was in progress (eg during background refresh triggered from /logout page)
      }

      return await updateUserSession(
        authProvider,
        request,
        latestSession,
        refreshedTokens
      )
    } catch (error) {
      request.logger.error({ message: 'Failed to refresh session', err: error })
      await removeUserSession(request)
      return null
    }
  }

  return refreshIdTokenAndUpdateSession
}

/**
 * @param {AuthProviders} authProviders
 * @returns {(request: HapiRequest, userSession: UserSession) => Promise<{isValid: boolean, credentials?: UserSession}>}
 */
const createBlockingRefresh = (authProviders) => {
  const refreshIdTokenAndUpdateSession =
    createRefreshIdTokenAndUpdateSession(authProviders)

  /** @type {ReturnType<typeof createBlockingRefresh>} */
  const blockingRefresh = async (request, userSession) => {
    const refreshedSession = await request.metrics.timer(
      'tokenRefreshDuration',
      () => refreshIdTokenAndUpdateSession(request, userSession),
      { type: 'blocking' }
    )

    request.logger.info({
      message: 'Token refresh complete (blocking)',
      event: tokenRefreshEvent('blocking', {
        outcome: refreshedSession ? 'success' : 'failure'
      })
    })

    return refreshedSession
      ? { isValid: true, credentials: refreshedSession }
      : { isValid: false }
  }

  return blockingRefresh
}

/**
 * @param {AuthProviders} authProviders
 * @returns {(request: HapiRequest, userSession: UserSession) => void}
 */
const createBackgroundRefresh = (authProviders) => {
  const refreshIdTokenAndUpdateSession =
    createRefreshIdTokenAndUpdateSession(authProviders)

  /** @type {ReturnType<typeof createBackgroundRefresh>} */
  const backgroundRefresh = (request, userSession) => {
    const run = async () => {
      const refreshedSession = await request.metrics.timer(
        'tokenRefreshDuration',
        () => refreshIdTokenAndUpdateSession(request, userSession),
        { type: 'background' }
      )

      request.logger.info({
        message: 'Token refresh complete (background)',
        event: tokenRefreshEvent('background', {
          outcome: refreshedSession ? 'success' : 'failure'
        })
      })
    }

    // fire-and-forget: deliberately not awaited so the current request is not delayed
    void run()
  }

  return backgroundRefresh
}

/**
 * Create session cookie authentication plugin
 * Factory function that creates a plugin with the auth providers a session can
 * come from
 * @param {AuthProviders} authProviders - The auth providers this server holds
 * @returns {ServerRegisterPluginObject<void>}
 */
const createSessionCookie = (authProviders) => {
  const blockingRefresh = createBlockingRefresh(authProviders)
  const backgroundRefresh = createBackgroundRefresh(authProviders)

  return {
    plugin: {
      name: 'user-session',
      register: async (server) => {
        await server.register(authCookie)

        server.auth.strategy(SESSION_STRATEGY, 'cookie', {
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

            // Every session carries the token its backend calls present. One
            // without it can only reach the backend unauthenticated, so it is
            // refused here and the user signs in again.
            if (!userSession.backendToken) {
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

        server.auth.default(SESSION_STRATEGY)
      }
    }
  }
}

export { createSessionCookie }
