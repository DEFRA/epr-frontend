import { buildViewModel } from './build-view-model.js'
import { fetchOverseasSites } from './helpers/fetch-overseas-sites.js'

/**
 * @import { ResponseToolkit } from '@hapi/hapi'
 * @import { HapiRequest, HapiServerRoute } from '#server/common/hapi-types.js'
 */

/**
 * @typedef {{ organisationId: string, registrationId: string }} OverseasSitesParams
 */

/**
 * @satisfies {Partial<HapiServerRoute<HapiRequest>>}
 */
export const controller = {
  /**
   * @param {HapiRequest & { params: OverseasSitesParams }} request
   * @param {ResponseToolkit} h
   */
  async handler(request, h) {
    const { organisationId, registrationId } = request.params
    const { backendToken } = request.auth.credentials

    const { organisation, registration, sites } = await fetchOverseasSites({
      organisationId,
      registrationId,
      backendToken
    })

    return h.view(
      'registrations/details/overseas-sites/index',
      buildViewModel({
        organisation,
        registration,
        sites,
        localise: request.t,
        localiseUrl: request.localiseUrl
      })
    )
  }
}
