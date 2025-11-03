import { config } from '#config/config.js'
import { provideAuthedUser } from '#server/logout/prerequisites/provide-authed-user.js'
import { isEmpty } from 'lodash-es'
import { removeUserSession } from '../common/helpers/auth/user-session.js'

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

    if (isEmpty(authedUser)) {
      return h.redirect('/')
    }

    const { href: postLogoutRedirectUrl } = new URL(
      request.localiseUrl('/'),
      config.get('appBaseUrl')
    )

    const idTokenHint = authedUser.idToken

    const logoutUrl = encodeURI(
      `${authedUser.logoutUrl}?id_token_hint=${idTokenHint}&post_logout_redirect_uri=${postLogoutRedirectUrl}`
    )

    removeUserSession(request)

    return h.redirect(logoutUrl)
  }
}

export { logoutController }

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
