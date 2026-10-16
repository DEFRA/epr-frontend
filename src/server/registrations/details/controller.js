import { organisationNumber } from '#server/common/helpers/organisation-number.js'
import { fetchOrganisation } from '#server/common/helpers/organisations/fetch-organisation.js'
import { registrationIn } from '#server/common/helpers/organisations/registration-in-view.js'

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
    const { organisationNumber: number, registrationNumber } = request.params
    const organisation = await fetchOrganisation(
      organisationNumber(Number(number)),
      request.auth.credentials.backendToken
    )

    return h.view(
      'registrations/details/index',
      buildViewModel({
        keys: { organisationNumber: number, registrationNumber },
        organisation,
        registration: registrationIn(organisation, registrationNumber),
        localise: request.t,
        localiseUrl: request.localiseUrl
      })
    )
  }
}
