import { getSafeRedirect } from '#utils/get-safe-redirect.js'
import { addSeconds } from 'date-fns'
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
      const expiresInSeconds = request.auth.credentials.expiresIn
      const expiresInMilliSeconds = expiresInSeconds * 1000
      const expiresAt = addSeconds(new Date(), expiresInSeconds)

      const sessionId = randomUUID()
      await request.server.app.cache.set(sessionId, {
        ...profile,
        isAuthenticated: request.auth.isAuthenticated,
        token: request.auth.credentials.token,
        refreshToken: request.auth.credentials.refreshToken,
        expiresIn: expiresInMilliSeconds,
        expiresAt
      })

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
 */
