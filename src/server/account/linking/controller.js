import { provideUserOrganisations } from './prerequisites/provide-user-organisations.js'
import { buildLinkingViewData } from './view-data.js'

export const ACCOUNT_LINKING_PATH = '/account/linking'

/** @satisfies {Partial<HapiServerRoute<HapiRequest>>} */
export const controller = {
  options: {
    pre: [provideUserOrganisations]
  },
  /**
   * @param {HapiRequest & { pre: UserOrganisationsPres }} request
   * @param {ResponseToolkit} h
   */
  handler(request, h) {
    const organisations = request.pre.userOrganisations

    // If there are no unlinked organisations, redirect to email-not-recognised page
    if (!organisations.unlinked || organisations.unlinked.length === 0) {
      return h.redirect('/email-not-recognised')
    }

    const viewData = buildLinkingViewData(request, organisations)

    return h.view('account/linking/index', viewData)
  }
}

/**
 * @import { ResponseToolkit } from '@hapi/hapi'
 * @import { HapiRequest, HapiServerRoute } from '#server/common/hapi-types.js'
 * @import { UserOrganisationsPres } from './prerequisites/provide-user-organisations.js'
 */
