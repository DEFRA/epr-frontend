import { ACCOUNT_LINKING_PATH } from '#server/account/linking/controller.js'
import { fetchUserOrganisations } from '#server/auth/helpers/fetch-user-organisations.js'
import { paths } from '#server/paths.js'
import { auditSignIn } from '#server/common/helpers/auditing/index.js'
import { metrics } from '#server/common/helpers/metrics/index.js'
import { getSafeRedirect } from '#utils/get-safe-redirect.js'
import { randomUUID, createHash } from 'node:crypto'

/** @import { ServerRoute } from '@hapi/hapi' */

/**
 * Hashes a user ID to avoid logging PII while preserving uniqueness for metrics
 * @param {string} userId
 * @returns {string}
 */
const hashUserId = (userId) => createHash('sha256').update(userId).digest('hex')

/**
 * Returns the path and its Welsh localised variant
 * @param {string} path
 * @returns {[string, string]}
 */
const withWelsh = (path) => [path, `/cy${path}`]

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

      request.logger.info(
        {
          event: {
            action: 'signInSuccess',
            reference: hashUserId(session.profile.id)
          }
        },
        'User has been successfully authenticated'
      )

      const organisations = await fetchUserOrganisations(session.idToken)

      if (!organisations.linked) {
        return h.redirect(ACCOUNT_LINKING_PATH)
      }

      const isInitialUser =
        organisations.linked.linkedBy?.id === session.profile.id
      if (!isInitialUser) {
        await metrics.signInSuccessNonInitialUser()
      }

      // Store linked organisation ID in session for navigation
      session.linkedOrganisationId = organisations.linked.id
      await request.server.app.cache.set(sessionId, session)

      const referrer = request.yar.flash('referrer')?.at(0)
      const skipReferrers = [
        ...withWelsh(paths.start),
        ...withWelsh(paths.loggedOut)
      ]
      const shouldSkipReferrer = skipReferrers.includes(referrer)

      // Don't redirect linked users back to start or logged-out pages - take them to dashboard
      if (referrer && !shouldSkipReferrer) {
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
