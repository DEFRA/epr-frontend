import { ACCOUNT_LINKING_PATH } from '#server/account/linking/controller.js'
import { addUserToOrganisation } from '#server/auth/helpers/add-user-to-organisation.js'
import { fetchUserOrganisations } from '#server/auth/helpers/fetch-user-organisations.js'
import { OIDC_DEFRA_ID } from '#server/auth/plugins/defra-id.js'
import { OIDC_ENTRA_ID } from '#server/auth/plugins/entra-id.js'
import { paths } from '#server/paths.js'
import { auditSignIn } from '#server/common/helpers/auditing/index.js'
import { metrics } from '#server/common/helpers/metrics/index.js'
import { getSafeRedirect } from '#utils/get-safe-redirect.js'
import { randomUUID, createHash } from 'node:crypto'

/**
 * @import { ResponseToolkit } from '@hapi/hapi'
 * @import { HapiRequest, HapiServerRoute } from '#server/common/hapi-types.js'
 */

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
 * @satisfies {Partial<HapiServerRoute<HapiRequest>>}
 */
const defraIdCallbackController = {
  options: {
    auth: { strategy: OIDC_DEFRA_ID, mode: 'try' }
  },
  /**
   * @param {HapiRequest} request
   * @param {ResponseToolkit} h
   */
  handler: async (request, h) => {
    if (request.auth?.error) {
      await metrics.signInFailure(OIDC_DEFRA_ID)
    }

    if (request.auth.isAuthenticated) {
      const session = request.auth.credentials

      const sessionId = randomUUID()
      await request.server.app.cache.set(sessionId, session)

      auditSignIn(OIDC_DEFRA_ID, session.profile.id, session.profile.email)
      await metrics.signInSuccess(OIDC_DEFRA_ID)

      request.cookieAuth.set({ sessionId })

      request.logger.info({
        message: 'User has been successfully authenticated',
        event: {
          action: 'signInSuccess',
          reference: hashUserId(session.profile.id)
        }
      })

      const organisations = await fetchUserOrganisations(session.idToken)

      if (!organisations.linked) {
        return h.redirect(ACCOUNT_LINKING_PATH)
      }

      await addUserToOrganisation(organisations.linked.id, session.idToken)

      const isInitialUser =
        organisations.linked.linkedBy?.id === session.profile.id
      if (!isInitialUser) {
        await metrics.signInSuccessNonInitialUser(OIDC_DEFRA_ID)
      }

      // Store linked organisation ID in session for navigation
      session.linkedOrganisationId = organisations.linked.id
      await request.server.app.cache.set(sessionId, session)

      const redirectUrl = referrerIfPresentElseDefault(
        request,
        request.localiseUrl(`/organisations/${organisations.linked.id}`)
      )

      return h.redirect(redirectUrl)
    }

    return h.redirect(referrerIfPresentElseDefault(request, '/'))
  }
}

/**
 * @param {HapiRequest} request
 * @param {string} defaultPath
 */
function referrerIfPresentElseDefault(request, defaultPath) {
  const referrer = request.yar.flash('referrer')?.at(0)

  const skipReferrers = [
    ...withWelsh(paths.start),
    ...withWelsh(paths.loggedOut),
    paths.auth.defraId.callback,
    paths.auth.entraId.callback
  ]

  const shouldSkipReferrer =
    referrer !== undefined && skipReferrers.includes(referrer)

  if (referrer && !shouldSkipReferrer) {
    return getSafeRedirect(referrer)
  }

  return getSafeRedirect(defaultPath)
}

/**
 * Auth callback controller
 * Handles the OAuth2/OIDC callback from Entra ID
 * Creates user session and sets session cookie for authenticated regulators
 * @satisfies {Partial<HapiServerRoute<HapiRequest>>}
 */
const entraIdCallbackController = {
  options: {
    auth: { strategy: OIDC_ENTRA_ID, mode: 'try' }
  },
  /**
   * @param {HapiRequest} request
   * @param {ResponseToolkit} h
   */
  handler: async (request, h) => {
    if (request.auth?.error) {
      await metrics.signInFailure(OIDC_ENTRA_ID)
    }

    if (request.auth.isAuthenticated) {
      const session = request.auth.credentials

      const sessionId = randomUUID()
      await request.server.app.cache.set(sessionId, session)

      auditSignIn(OIDC_ENTRA_ID, session.profile.id, session.profile.email)
      await metrics.signInSuccess(OIDC_ENTRA_ID)

      request.cookieAuth.set({ sessionId })

      request.logger.info({
        message: 'User has been successfully authenticated',
        event: {
          action: 'signInSuccess',
          reference: hashUserId(session.profile.id)
        }
      })

      const redirectUrl = referrerIfPresentElseDefault(
        request,
        request.localiseUrl(paths.regulators.home)
      )

      return h.redirect(redirectUrl)
    }

    return h.redirect(referrerIfPresentElseDefault(request, '/'))
  }
}

export { defraIdCallbackController, entraIdCallbackController }
