import { fetchRegistration } from '#server/common/helpers/organisations/fetch-registration.js'

import { buildViewModel } from './build-view-model.js'
import { registrationParamsValidation } from '../helpers/year-params-schema.js'

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
  options: {
    validate: registrationParamsValidation(
      'Overseas sites not found',
      'fetch_overseas_sites'
    )
  },
  /**
   * @param {HapiRequest & { params: OverseasSitesParams }} request
   * @param {ResponseToolkit} h
   */
  async handler(request, h) {
    const { organisationNumber, registrationNumber } = request.params
    const { organisation, registration } = await fetchRegistration({
      organisationNumber,
      registrationNumber,
      backendToken: request.auth.credentials.backendToken
    })

    return h.view(
      'registrations/details/overseas-sites/index',
      buildViewModel({
        organisation,
        registrationNumber,
        registration,
        localise: request.t,
        localiseUrl: request.localiseUrl
      })
    )
  }
}
