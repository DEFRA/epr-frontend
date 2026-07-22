import { ACCOUNT_LINKING_PATH } from '#server/account/linking/controller.js'
import { addUserToOrganisation } from '#server/auth/helpers/add-user-to-organisation.js'
import { fetchUserOrganisations } from '#server/auth/helpers/fetch-user-organisations.js'
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
const defraCallbackController = {
  options: {
    auth: { strategy: 'defra-id', mode: 'try' }
    // auth: { strategies: ['entra-id', 'defra-id'], mode: 'try' } - this doesn't work, second auth strategy never attempted
    // auth: { strategies: ['entra-id', 'defra-id'], mode: 'required' } - this doesn't work, first auth strategy 500s when trying to authenticate with second (because missing bell cookie)
  },
  /**
   * @param {HapiRequest} request
   * @param {ResponseToolkit} h
   */
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
      const shouldSkipReferrer =
        referrer !== undefined && skipReferrers.includes(referrer)

      // Don't redirect linked users back to start or logged-out pages - take them to dashboard
      if (referrer && !shouldSkipReferrer) {
        return h.redirect(getSafeRedirect(referrer))
      }

      return h.redirect(
        request.localiseUrl(`/organisations/${organisations.linked.id}`)
      )
    }

    if (request.state['bell-entra-id']) {
      // hack
      // Entra is configured to callback /auth/callback
      // but hapi can't support two schemes on the same callback URL...
      // ...so re-direct to the entra callback _if the callback looks like it was Entra_
      // The proper fix here is to configure Entra with /auth/callback/entra
      return h.redirect(`/auth/callback/entra${request.url.search}`)
    }

    const redirect = request.yar.flash('referrer')?.at(0) ?? '/'

    const safeRedirect = getSafeRedirect(redirect)
    return h.redirect(safeRedirect)
  }
}

/**
 * Auth callback controller
 * Handles the OAuth2/OIDC callback from Defra ID
 * Creates user session and sets session cookie
 * @satisfies {Partial<HapiServerRoute<HapiRequest>>}
 */
const entraCallbackController = {
  options: {
    auth: { strategy: 'entra-id', mode: 'try' }
  },
  /**
   * @param {HapiRequest} request
   * @param {ResponseToolkit} h
   */
  handler: async (request, h) => {
    if (request.auth?.error) {
      await metrics.signInFailure() // TODO regulator specific metric?
    }

    if (request.auth.isAuthenticated) {
      const session = request.auth.credentials

      const sessionId = randomUUID()
      await request.server.app.cache.set(sessionId, session)

      auditSignIn(session.profile.id, session.profile.email) // TODO regulator specific auditing?
      await metrics.signInSuccess() // TODO regulator login specific metrics?

      request.cookieAuth.set({ sessionId })

      request.logger.info({
        message: 'User has been successfully authenticated',
        event: {
          action: 'signInSuccess',
          reference: hashUserId(session.profile.id)
        }
      })

      // TODO referrer handling
      return h.redirect(request.localiseUrl(`/regulators/home`))
    }

    const redirect = request.yar.flash('referrer')?.at(0) ?? '/'

    const safeRedirect = getSafeRedirect(redirect)
    return h.redirect(safeRedirect)
  }
}

export { defraCallbackController, entraCallbackController }
