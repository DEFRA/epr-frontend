import { getRedirectUrl } from '#server/auth/helpers/get-redirect-url.js'
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

    const oidcProviderLogoutUrl = new URL(session.urls.logout)
    oidcProviderLogoutUrl.searchParams.append('id_token_hint', session.idToken)
    oidcProviderLogoutUrl.searchParams.append(
      'post_logout_redirect_uri',
      getRedirectUrl(request, paths.auth.postLogoutRedirect)
    )

    return h.redirect(oidcProviderLogoutUrl.toString())
  }
}

export { logoutController }
