import { provideAuthedUser } from '#server/logout/prerequisites/provide-authed-user.js'
import { buildLinkingViewData } from './view-data.js'

/**
 * @satisfies {Partial<ServerRoute>}
 */
export const controller = {
  options: {
    pre: [provideAuthedUser]
  },
  handler(request, h) {
    const authedUser = request.pre.authedUser
    const viewData = buildLinkingViewData(request, authedUser)

    return h.view('account/linking/index', viewData)
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
