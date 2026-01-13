import { config } from '#config/config.js'
import { removeUserSession } from '#server/auth/helpers/user-session.js'
import { provideAuthedUser } from '#server/logout/prerequisites/provide-authed-user.js'

/**
 * Logout controller
 * Clears local session and redirects to Defra ID logout endpoint
 * @satisfies {Partial<ServerRoute>}
 */
const logoutController = {
  options: {
    pre: [provideAuthedUser]
  },
  handler: async (request, h) => {
    const authedUser = request.pre.authedUser
    const loggedOutUrl = request.localiseUrl('/logged-out')

    if (!authedUser) {
      return h.redirect(loggedOutUrl)
    }

    const { href: postLogoutRedirectUrl } = new URL(
      request.localiseUrl(loggedOutUrl),
      config.get('appBaseUrl')
    )

    const logoutUrl = new URL(authedUser.urls.logout)
    logoutUrl.searchParams.append('id_token_hint', authedUser.idToken)
    logoutUrl.searchParams.append(
      'post_logout_redirect_uri',
      postLogoutRedirectUrl
    )

    await removeUserSession(request)

    return h.redirect(logoutUrl)
  }
}

export { logoutController }

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
