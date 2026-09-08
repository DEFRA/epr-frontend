import { buildViewModel } from './build-view-model.js'
import { fetchPrnListDetails } from './helpers/fetch-prn-list-details.js'

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
 * The notes an accreditation has issued, read-only.
 *
 * This handler is not routed from here. It is reached through the fork in
 * `src/server/prns/index.js`, which serves one address to two audiences: the
 * operator keeps their own list, and a regulator gets this page.
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

    const details = await fetchPrnListDetails({
      organisationId,
      registrationId,
      accreditationId,
      backendToken
    })

    return h.view(
      'registrations/details/accreditations/packaging-recycling-notes/index',
      buildViewModel({
        ...details,
        localise: request.t,
        localiseUrl: request.localiseUrl
      })
    )
  }
}
