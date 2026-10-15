import { errorCodes } from '#server/common/enums/error-codes.js'
import { notFound } from '#server/common/helpers/logging/cdp-boom.js'

import { buildViewModel } from './build-view-model.js'
import { fetchReportListDetails } from './helpers/fetch-report-list-details.js'
import { yearParamsSchema } from '../../helpers/year-params-schema.js'

/**
 * @import { ResponseToolkit } from '@hapi/hapi'
 * @import { HapiRequest, HapiServerRoute } from '#server/common/hapi-types.js'
 */

/**
 * @typedef {{
 *   organisationNumber: string,
 *   registrationNumber: string,
 *   year: number
 * }} AccreditationParams
 */

/**
 * An accreditation's reporting periods, read-only.
 * @satisfies {Partial<HapiServerRoute<HapiRequest>>}
 */
export const controller = {
  options: {
    validate: {
      params: yearParamsSchema,
      // 404 not 400, as the registered-only period does.
      failAction: () => {
        throw notFound(
          'Accreditation reports not found',
          errorCodes.accreditationNotFound,
          {
            event: {
              action: 'fetch_accreditation_reports',
              reason: 'the address holds no such accreditation'
            }
          }
        )
      }
    }
  },
  /**
   * @param {HapiRequest & { params: AccreditationParams }} request
   * @param {ResponseToolkit} h
   */
  async handler(request, h) {
    const { organisationNumber, registrationNumber, year } = request.params
    const keys = { organisationNumber, registrationNumber, year: String(year) }
    const { backendToken } = request.auth.credentials

    const details = await fetchReportListDetails({ ...keys, backendToken })

    return h.view(
      'registrations/details/accreditations/reports/index',
      buildViewModel({ ...details, keys, request })
    )
  }
}
