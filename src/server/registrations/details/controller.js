import { buildViewModel } from './build-view-model.js'
import { fetchRegistrationDetails } from './helpers/fetch-registration-details.js'

/**
 * @import { ResponseToolkit } from '@hapi/hapi'
 * @import { HapiRequest, HapiServerRoute } from '#server/common/hapi-types.js'
 */

/**
 * @typedef {{ organisationId: string, registrationId: string }} RegistrationParams
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
    const { organisationId, registrationId } = request.params
    const { backendToken } = request.auth.credentials

    const { organisation, registration, accreditations, linkedAccreditation } =
      await fetchRegistrationDetails({
        organisationId,
        registrationId,
        backendToken
      })

    return h.view(
      'registrations/details/index',
      buildViewModel({
        organisation,
        registration,
        accreditations,
        linkedAccreditation,
        credentials: request.auth.credentials,
        localise: request.t,
        localiseUrl: request.localiseUrl
      })
    )
  }
}
