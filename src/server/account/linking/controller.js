import { provideAuthedUser } from '#server/logout/prerequisites/provide-authed-user.js'
import { provideUserOrganisations } from './prerequisites/provide-user-organisations.js'
import { buildLinkingViewData } from './view-data.js'

export const ACCOUNT_LINKING_PATH = '/account/linking'

/**
 * @satisfies {Partial<ServerRoute>}
 */
export const controller = {
  options: {
    pre: [provideAuthedUser, provideUserOrganisations]
  },
  handler(request, h) {
    const organisations = request.pre.userOrganisations
    const viewData = buildLinkingViewData(request, organisations)

    return h.view('account/linking/index', viewData)
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
