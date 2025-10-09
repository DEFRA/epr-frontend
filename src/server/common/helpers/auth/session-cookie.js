import authCookie from '@hapi/cookie'
import { isPast, parseISO, subMinutes } from 'date-fns'

import { config } from '~/src/config/config.js'
import { getUserSession } from '~/src/server/common/helpers/auth/get-user-session.js'
import { refreshAccessToken } from '~/src/server/common/helpers/auth/refresh-token.js'
import {
  removeUserSession,
  updateUserSession
} from '~/src/server/common/helpers/auth/user-session.js'

/**
 * Session cookie authentication plugin
 * Handles session validation and automatic token refresh
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
