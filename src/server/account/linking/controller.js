import { provideAuthedUser } from '#server/logout/prerequisites/provide-authed-user.js'
import { buildLinkingViewData } from './view-data.js'

export const ACCOUNT_LINKING_PATH = '/account/linking'

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
