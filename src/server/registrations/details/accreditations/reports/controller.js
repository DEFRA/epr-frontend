import { buildViewModel } from './build-view-model.js'
import { fetchReportListDetails } from './helpers/fetch-report-list-details.js'

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
 * An accreditation's reporting periods, read-only.
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

    const details = await fetchReportListDetails({
      organisationId,
      registrationId,
      accreditationId,
      backendToken
    })

    return h.view(
      'registrations/details/accreditations/reports/index',
      buildViewModel({ ...details, request })
    )
  }
}
