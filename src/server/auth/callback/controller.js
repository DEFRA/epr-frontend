import { buildSessionFromProfile } from '#server/auth/helpers/build-session.js'
import { getSafeRedirect } from '#utils/get-safe-redirect.js'
import { randomUUID } from 'node:crypto'

/**
 * Auth callback controller
 * Handles the OAuth2/OIDC callback from Defra ID
 * Creates user session and sets session cookie
 * @satisfies {Partial<ServerRoute>}
 */
const controller = {
  options: {
    auth: 'defra-id'
  },
  handler: async (request, h) => {
    if (request.auth.isAuthenticated) {
      const { profile } = request.auth.credentials

      const session = buildSessionFromProfile({
        credentials: request.auth.credentials,
        isAuthenticated: request.auth.isAuthenticated,
        profile
      })

      const sessionId = randomUUID()
      await request.server.app.cache.set(sessionId, session)

      request.cookieAuth.set({ sessionId })

      request.logger.info('User has been successfully authenticated')
    }

    const redirect = request.yar.flash('referrer')?.at(0) ?? '/'

    const safeRedirect = getSafeRedirect(redirect)
    return h.redirect(safeRedirect)
  }
}

export { controller }

/**
 * @import { ServerRoute } from '@hapi/hapi'
 * @import { UserProfile, UserSession } from '../types/session.js'
 */
