import { ACCOUNT_LINKING_PATH } from '#server/account/linking/controller.js'
import { fetchUserOrganisations } from '#server/auth/helpers/fetch-user-organisations.js'
import { getSafeRedirect } from '#utils/get-safe-redirect.js'
import { randomUUID } from 'node:crypto'
import { metrics } from '#server/common/helpers/metrics/index.js'
import { auditSignIn } from '#server/common/helpers/auditing/index.js'

/**
 * Auth callback controller
 * Handles the OAuth2/OIDC callback from Defra ID
 * Creates user session and sets session cookie
 * @satisfies {Partial<ServerRoute>}
 */
const controller = {
  options: {
    auth: { strategy: 'defra-id', mode: 'try' }
  },
  handler: async (request, h) => {
    if (request.auth?.error) {
      await metrics.signInFailure()
    }
    if (request.auth.isAuthenticated) {
      const session = request.auth.credentials

      const sessionId = randomUUID()
      await request.server.app.cache.set(sessionId, session)

      auditSignIn(session.profile.id, session.profile.email)
      await metrics.signInSuccess()

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
      const isStartPage = ['/start', '/cy/start'].includes(referrer)

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
