import { organisationNumber } from '#server/common/helpers/organisation-number.js'
import { fetchOrganisation } from '#server/common/helpers/organisations/fetch-organisation.js'
import { buildViewModel } from './build-view-model.js'

/**
 * @import { ResponseToolkit } from '@hapi/hapi'
 * @import { HapiRequest, HapiServerRoute } from '#server/common/hapi-types.js'
 * @import { OrganisationParams } from '../index.js'
 */

/** @satisfies {Partial<HapiServerRoute<HapiRequest>>} */
export const controller = {
  /**
   * @param {HapiRequest & { params: OrganisationParams }} request
   * @param {ResponseToolkit} h
   */
  async handler(request, h) {
    const { backendToken } = request.auth.credentials

    const organisation = await fetchOrganisation(
      organisationNumber(Number(request.params.organisationNumber)),
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
