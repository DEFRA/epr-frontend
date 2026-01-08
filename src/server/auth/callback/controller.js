import { ACCOUNT_LINKING_PATH } from '#server/account/linking/controller.js'
import { buildSessionFromProfile } from '#server/auth/helpers/build-session.js'
import { fetchUserOrganisations } from '#server/auth/helpers/fetch-user-organisations.js'
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

      const organisations = await fetchUserOrganisations(session.idToken)

      if (!organisations.linked) {
        return h.redirect(ACCOUNT_LINKING_PATH)
      }

      // Store linked organisation ID in session for navigation
      session.linkedOrganisationId = organisations.linked.id
      await request.server.app.cache.set(sessionId, session)

      const referrer = request.yar.flash('referrer')?.at(0)
      const isStartPage = referrer === '/start' || referrer === '/cy/start'

      // Don't redirect linked users back to start page - take them to dashboard
      if (referrer && !isStartPage) {
        return h.redirect(getSafeRedirect(referrer))
      }

      return h.redirect(
        request.localiseUrl(`/organisations/${organisations.linked.id}`)
      )
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
