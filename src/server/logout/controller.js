import { buildProviderSignOutUrl } from '#server/auth/helpers/provider-sign-out-url.js'
import { rememberSignedOutProvider } from '#server/auth/helpers/signed-out-provider.js'
import { paths } from '#server/paths.js'
import { removeUserSession } from '#server/auth/helpers/user-session.js'
import { auditSignOut } from '#server/common/helpers/auditing/index.js'
import { metrics } from '#server/common/helpers/metrics/index.js'

/**
 * @import { ResponseToolkit } from '@hapi/hapi'
 * @import { HapiRequest, HapiServerRoute } from '#server/common/hapi-types.js'
 */

/**
 * Logout controller
 * Clears local session and redirects to Defra ID logout endpoint
 * @satisfies {Partial<HapiServerRoute<HapiRequest>>}
 */
const logoutController = {
  /**
   * @param {HapiRequest} request
   * @param {ResponseToolkit} h
   */
  handler: async (request, h) => {
    const session = request.auth.credentials

    if (!session) {
      const loggedOutUrl = request.localiseUrl(paths.loggedOut)
      return h.redirect(loggedOutUrl)
    }

    await removeUserSession(request)

    auditSignOut(session.provider, session.profile.id, session.profile.email)
    await metrics.signOutSuccess(session.provider)

    rememberSignedOutProvider(h, session.provider)

    return h.redirect(buildProviderSignOutUrl(request, session))
  }
}

export { logoutController }
