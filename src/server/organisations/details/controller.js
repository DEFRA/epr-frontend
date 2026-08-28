import { fetchOrganisationById } from '#server/common/helpers/organisations/fetch-organisation-by-id.js'
import { buildViewModel } from './build-view-model.js'

/**
 * @import { ResponseToolkit } from '@hapi/hapi'
 * @import { HapiRequest, HapiServerRoute } from '#server/common/hapi-types.js'
 */

/**
 * @typedef {{ organisationId: string }} OrganisationParams
 */

/** @satisfies {Partial<HapiServerRoute<HapiRequest>>} */
export const controller = {
  /**
   * @param {HapiRequest & { params: OrganisationParams }} request
   * @param {ResponseToolkit} h
   */
  async handler(request, h) {
    const { organisationId } = request.params
    const { backendToken } = request.auth.credentials

    const organisation = await fetchOrganisationById(
      organisationId,
      backendToken
    )

    return h.view(
      'organisations/details/index',
      buildViewModel({
        organisation,
        activeTab: request.path.endsWith('/exporting')
          ? 'EXPORTER'
          : 'REPROCESSOR',
        localise: request.t,
        localiseUrl: request.localiseUrl
      })
    )
  }
}
