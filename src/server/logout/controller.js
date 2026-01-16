import { getRedirectUrl } from '#server/auth/helpers/get-redirect-url.js'
import { paths } from '#server/paths.js'
import { removeUserSession } from '#server/auth/helpers/user-session.js'
import { auditSignOut } from '#server/common/helpers/auditing/index.js'
import { metrics } from '#server/common/helpers/metrics/index.js'

/** @import { ServerRoute } from '@hapi/hapi' */

/**
 * Logout controller
 * Clears local session and redirects to Defra ID logout endpoint
 * @satisfies {Partial<ServerRoute>}
 */
const logoutController = {
  handler: async (request, h) => {
    const session = request.auth.credentials

    const loggedOutUrl = request.localiseUrl(paths.loggedOut)

    if (!session) {
      return h.redirect(loggedOutUrl)
    }

    await removeUserSession(request)

    auditSignOut(session.profile.id, session.profile.email)
    await metrics.signOutSuccess()

    const logoutUrl = new URL(session.urls.logout)
    logoutUrl.searchParams.append('id_token_hint', session.idToken)
    logoutUrl.searchParams.append(
      'post_logout_redirect_uri',
      getRedirectUrl(request, paths.auth.logout)
    )

    return h.redirect(logoutUrl)
  }
}

export { logoutController }
