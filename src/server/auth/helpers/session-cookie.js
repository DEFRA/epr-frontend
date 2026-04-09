import { config } from '#config/config.js'
import {
  markSessionAsIdTokenRefreshInProgress,
  removeUserSession,
  updateUserSession
} from '#server/auth/helpers/user-session.js'
import { paths } from '#server/paths.js'
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
 * @returns {(request: Request, userSession: UserSession) => Promise<UserSession | null>}
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

  return refreshIdTokenAndUpdateSession
}

/**
 * @param {VerifyToken} verifyToken
 * @returns {(request: Request, userSession: UserSession) => Promise<{isValid: boolean, credentials?: UserSession}>}
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
 * @returns {(request: Request, userSession: UserSession) => void}
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

        // Expose blockingRefresh for the /auth/refresh endpoint
        server.app.blockingRefresh = blockingRefresh

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
              if (request.method === 'get') {
                // Flag for onPostAuth to redirect to /auth/refresh.
                // This moves the slow OIDC token refresh off the page
                // response time, avoiding false alerts on the CDP
                // average response time metric.
                request.app.needsTokenRefreshRedirect = true
              } else {
                // Non-GET requests (e.g. POST) still use inline blocking
                // refresh because a redirect would lose the request body
                return blockingRefresh(request, userSession)
              }
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

        // Redirect expired GET requests to /auth/refresh instead of
        // blocking inline. The refresh endpoint is a distinct URL that
        // can be excluded from the CDP response time alert.
        server.ext('onPostAuth', (request, h) => {
          if (
            request.app.needsTokenRefreshRedirect &&
            request.path !== paths.auth.refresh
          ) {
            const returnTo = `${request.url.pathname}${request.url.search}`
            return h
              .redirect(
                `${paths.auth.refresh}?returnTo=${encodeURIComponent(returnTo)}`
              )
              .takeover()
          }
          return h.continue
        })
      }
    }
  }
}

export { createSessionCookie }
