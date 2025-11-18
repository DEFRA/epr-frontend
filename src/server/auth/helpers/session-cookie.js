import { config } from '#config/config.js'
import {
  removeUserSession,
  updateUserSession
} from '#server/auth/helpers/user-session.js'
import authCookie from '@hapi/cookie'
import { isPast, parseISO, subMinutes } from 'date-fns'
import { getUserSession } from './get-user-session.js'
import { refreshAccessToken } from './refresh-token.js'

/**
 * Session cookie authentication plugin
 * Handles session validation and automatic token refresh
 * @satisfies {ServerRegisterPluginObject<void>}
 */
const sessionCookie = {
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
        validate: async (request, session) => {
          const { ok, value: authedUser } = await getUserSession(request)

          if (!ok) {
            return { isValid: false }
          }

          // Check if token will expire in less than 1 minute
          const tokenHasExpired = isPast(
            subMinutes(parseISO(authedUser.expiresAt), 1)
          )

          // FIXME work to do here wrt refresh and invalidation
          if (tokenHasExpired) {
            const response = await refreshAccessToken(request)
            const refreshAccessTokenJson = await response.json()

            if (!response.ok) {
              removeUserSession(request)

              return { isValid: false }
            }

            await updateUserSession(request, refreshAccessTokenJson)

            // return {
            //   isValid: true,
            //   credentials: updatedSession
            // }
          }

          const userSession = await server.app.cache.get(session.sessionId)

          /* c8 ignore else - Extreme edge case: session deleted between first lookup and this second lookup (race condition) */
          if (userSession) {
            return {
              isValid: true,
              credentials: userSession
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

export { sessionCookie }

/**
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 */
