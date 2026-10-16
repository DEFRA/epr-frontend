import { errorCodes } from '#server/common/enums/error-codes.js'

import { buildViewModel } from './build-view-model.js'
import { fetchReportListDetails } from './helpers/fetch-report-list-details.js'
import {
  paramsOrNotFound,
  yearParamsSchema
} from '../../helpers/params-validation.js'

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
    validate: paramsOrNotFound(yearParamsSchema, {
      message: 'Accreditation reports not found',
      code: errorCodes.accreditationNotFound,
      action: 'fetch_accreditation_reports',
      reason: 'the address holds no such accreditation'
    })
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
