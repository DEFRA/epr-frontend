import { buildViewModel } from './build-view-model.js'
import { fetchAccreditationDetails } from './helpers/fetch-accreditation-details.js'

/**
 * @import { ResponseToolkit } from '@hapi/hapi'
 * @import { HapiRequest, HapiServerRoute } from '#server/common/hapi-types.js'
 */

/**
 * @typedef {{
 *   organisationId: string,
 *   registrationId: string,
 *   accreditationId: string
 * }} AccreditationParams
 */

/**
 * @satisfies {Partial<HapiServerRoute<HapiRequest>>}
 */
export const controller = {
  /**
   * @param {HapiRequest & { params: AccreditationParams }} request
   * @param {ResponseToolkit} h
   */
  async handler(request, h) {
    const { organisationId, registrationId, accreditationId } = request.params
    const { backendToken } = request.auth.credentials

    const { organisation, registration, accreditation } =
      await fetchAccreditationDetails({
        organisationId,
        registrationId,
        accreditationId,
        backendToken
      })

    return h.view(
      'registrations/details/accreditations/index',
      buildViewModel({
        organisation,
        registration,
        accreditation,
        localise: request.t,
        localiseUrl: request.localiseUrl
      })
    )
  }
}
