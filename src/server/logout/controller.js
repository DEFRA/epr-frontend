import { config } from '#config/config.js'
import { removeUserSession } from '#server/auth/helpers/user-session.js'
import { metrics } from '#server/common/helpers/metrics/index.js'
import { auditSignOut } from '#server/common/helpers/auditing/index.js'

/**
 * Logout controller
 * Clears local session and redirects to Defra ID logout endpoint
 * @satisfies {Partial<ServerRoute>}
 */
const logoutController = {
  handler: async (request, h) => {
    const session = request.auth.credentials

    const loggedOutUrl = request.localiseUrl('/logged-out')

    if (!session) {
      return h.redirect(loggedOutUrl)
    }

    const { href: postLogoutRedirectUrl } = new URL(
      loggedOutUrl,
      config.get('appBaseUrl')
    )
    const logoutUrl = new URL(session.urls.logout)
    logoutUrl.searchParams.append('id_token_hint', session.idToken)
    logoutUrl.searchParams.append(
      'post_logout_redirect_uri',
      postLogoutRedirectUrl
    )

    await removeUserSession(request)

    auditSignOut(session.profile.id, session.profile.email)
    await metrics.signOutSuccess()

    return h.redirect(logoutUrl)
  }
}

export { logoutController }

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
