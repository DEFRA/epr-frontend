import { fetchRegistration } from '#server/common/helpers/organisations/fetch-registration.js'

import { buildViewModel } from './build-view-model.js'

/**
 * @import { ResponseToolkit } from '@hapi/hapi'
 * @import { HapiRequest, HapiServerRoute } from '#server/common/hapi-types.js'
 */

/**
 * @typedef {{ organisationNumber: string, registrationNumber: string }} RegistrationParams
 */

/**
 * @satisfies {Partial<HapiServerRoute<HapiRequest>>}
 */
export const controller = {
  /**
   * @param {HapiRequest & { params: RegistrationParams }} request
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
      'registrations/details/index',
      buildViewModel({
        keys: { organisationNumber, registrationNumber },
        organisation,
        registration,
        localise: request.t,
        localiseUrl: request.localiseUrl
      })
    )
  }
}
