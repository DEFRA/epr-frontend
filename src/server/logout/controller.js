import { isEmpty } from 'lodash-es'
import { dropUserSession } from '~/src/server/common/helpers/auth/drop-user-session.js'
import { provideAuthedUser } from '~/src/server/logout/prerequisites/provide-authed-user.js'

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

    const referrer = request.info.referrer
    const idTokenHint = authedUser.idToken

    const logoutUrl = encodeURI(
      `${authedUser.logoutUrl}?id_token_hint=${idTokenHint}&post_logout_redirect_uri=${referrer}`
    )

    // FIXME should this be awaited?
    dropUserSession(request)
    request.cookieAuth.clear()

    return h.redirect(logoutUrl)
  }
}

export { logoutController }

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
