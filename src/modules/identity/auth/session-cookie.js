import authCookie from '@hapi/cookie'
import { isPast, parseISO, subMinutes } from 'date-fns'
import { config } from '#config/config.js'
import {
  removeUserSession,
  updateUserSession
} from '#modules/identity/auth/user-session.js'
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
          const authedUser = await getUserSession(request)

          // Check if token will expire in less than 1 minute
          const tokenHasExpired = isPast(
            subMinutes(parseISO(authedUser.expiresAt), 1)
          )

          if (tokenHasExpired) {
            const response = await refreshAccessToken(request)
            const refreshAccessTokenJson = await response.json()

            if (!response.ok) {
              removeUserSession(request)

              return { isValid: false }
            }

            const updatedSession = await updateUserSession(
              request,
              refreshAccessTokenJson
            )

            return {
              isValid: true,
              credentials: updatedSession
            }
          }

          const userSession = await server.app.cache.get(session.sessionId)

          if (userSession) {
            return {
              isValid: true,
              credentials: userSession
            }
          }

          return { isValid: false }
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
