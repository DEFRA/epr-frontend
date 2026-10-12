import { buildViewModel } from './build-view-model.js'
import { fetchOverseasSites } from './helpers/fetch-overseas-sites.js'

/**
 * @import { ResponseToolkit } from '@hapi/hapi'
 * @import { HapiRequest, HapiServerRoute } from '#server/common/hapi-types.js'
 */

/**
 * @typedef {{ organisationNumber: string, registrationNumber: string }} OverseasSitesParams
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
    const { organisationNumber, registrationNumber } = request.params
    const { backendToken } = request.auth.credentials

    const details = await fetchOverseasSites({
      organisationNumber,
      registrationNumber,
      backendToken
    })

    return h.view(
      'registrations/details/overseas-sites/index',
      buildViewModel({
        ...details,
        localise: request.t,
        localiseUrl: request.localiseUrl
      })
    )
  }
}
