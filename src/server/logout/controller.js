import { getRedirectUrl } from '#server/auth/helpers/get-redirect-url.js'
import { removeUserSession } from '#server/auth/helpers/user-session.js'
import { auditSignOut } from '#server/common/helpers/auditing/index.js'
import { metrics } from '#server/common/helpers/metrics/index.js'

const LOGGED_OUT_PATH = '/logged-out'

/** @import { ServerRoute } from '@hapi/hapi' */

/**
 * Logout controller
 * Clears local session and redirects to Defra ID logout endpoint
 * @satisfies {Partial<ServerRoute>}
 */
const logoutController = {
  handler: async (request, h) => {
    const session = request.auth.credentials

    const loggedOutUrl = request.localiseUrl(LOGGED_OUT_PATH)

    if (!session) {
      return h.redirect(loggedOutUrl)
    }

    const logoutUrl = new URL(session.urls.logout)
    logoutUrl.searchParams.append('id_token_hint', session.idToken)
    logoutUrl.searchParams.append(
      'post_logout_redirect_uri',
      getRedirectUrl(request, loggedOutUrl)
    )

    await removeUserSession(request)

    auditSignOut(session.profile.id, session.profile.email)
    await metrics.signOutSuccess()

    return h.redirect(logoutUrl)
  }
}

export { logoutController }
