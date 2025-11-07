import { isEmpty } from 'lodash-es'
import { provideAuthedUser } from '#server/logout/prerequisites/provide-authed-user.js'
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

    // @fixme: retrieve protocol, hostname, port from config so that it works for all environments
    const referrer = 'http://localhost:3000/'
    const idTokenHint = authedUser.idToken

    const logoutUrl = encodeURI(
      `${authedUser.logoutUrl}?id_token_hint=${idTokenHint}&post_logout_redirect_uri=${referrer}`
    )

    removeUserSession(request)

    return h.redirect(logoutUrl)
  }
}

export { logoutController }

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
