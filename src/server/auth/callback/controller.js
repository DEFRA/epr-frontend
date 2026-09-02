import { ACCOUNT_LINKING_PATH } from '#server/account/linking/controller.js'
import { addUserToOrganisation } from '#server/auth/helpers/add-user-to-organisation.js'
import { fetchIdentity } from '#server/auth/helpers/fetch-identity.js'
import { hashUserId } from '#server/auth/helpers/hash-user-id.js'
import { fetchUserOrganisations } from '#server/auth/helpers/fetch-user-organisations.js'
import { OIDC_DEFRA_ID } from '#server/auth/plugins/defra-id.js'
import {
  OIDC_ENTRA_ID,
  SELECT_ACCOUNT_QUERY
} from '#server/auth/plugins/entra-id.js'
import { holdsNoRole } from '#server/auth/roles.js'
import { paths } from '#server/paths.js'
import { auditSignIn } from '#server/common/helpers/auditing/index.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { metrics } from '#server/common/helpers/metrics/index.js'
import { getSafeRedirect } from '#utils/get-safe-redirect.js'
import { randomUUID } from 'node:crypto'

/**
 * @import { ResponseToolkit } from '@hapi/hapi'
 * @import { HapiRequest, HapiServerRoute } from '#server/common/hapi-types.js'
 * @import { UserSession } from '#server/auth/types/session.js'
 */

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

      await applyBackendIdentity(session)

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

      const organisations = await fetchUserOrganisations(session.backendToken)

      if (!organisations.linked) {
        return h.redirect(ACCOUNT_LINKING_PATH)
      }

      await addUserToOrganisation(organisations.linked.id, session.backendToken)

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
 * Asks the backend who the newly authenticated identity is, and records the
 * answer on the session. Authentication establishes identity and grants
 * nothing; this is where a session learns what it may do.
 * @param {UserSession} session
 * @returns {Promise<void>}
 */
async function applyBackendIdentity(session) {
  const { role, scopes } = await fetchIdentity(session.backendToken)

  session.role = role
  session.scope = scopes
}

/**
 * The referrer stash is a queue, and a sign in that ends without redirecting
 * leaves its entry in it, so the newest entry is the one this sign in recorded.
 * @param {HapiRequest} request
 * @param {string} defaultPath
 */
function referrerIfPresentElseDefault(request, defaultPath) {
  const referrer = request.yar.flash('referrer')?.at(-1)

  const skipReferrers = [
    ...withWelsh(paths.start),
    ...withWelsh(paths.loggedOut),
    ...withWelsh(paths.regulators.loggedOut),
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
 * @param {HapiRequest} request
 * @param {ResponseToolkit} h
 * @param {UserSession} session
 */
const refuseSignIn = async (request, h, session) => {
  await metrics.signInFailure(OIDC_ENTRA_ID)

  request.logger.info({
    message: 'User has no role on this service, so no session was created',
    event: {
      action: 'signInRefused',
      reference: hashUserId(session.profile.id)
    }
  })

  return h
    .view('regulators/not-authorised', {
      pageTitle: request.t('regulators:notAuthorised:pageTitle'),
      signInUrl: `${request.localiseUrl(paths.auth.entraId.login)}?${SELECT_ACCOUNT_QUERY}`
    })
    .code(statusCodes.forbidden)
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

      await applyBackendIdentity(session)

      if (holdsNoRole(session)) {
        return refuseSignIn(request, h, session)
      }

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
