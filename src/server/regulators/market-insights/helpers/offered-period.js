import Boom from '@hapi/boom'

import { offeredYears } from './offered-years.js'
import { reportingPeriodOf } from './reporting-period.js'

/**
 * @import { HapiRequest } from '#server/common/hapi-types.js'
 * @import { Year } from '#server/common/helpers/year.js'
 * @import { ReportingPeriod } from './reporting-period.js'
 */

/**
 * The reporting period of the year in the address, or a 404 for a year not
 * offered.
 * @param {HapiRequest & { params: { year: Year } }} request
 * @returns {ReportingPeriod}
 */
export const offeredPeriod = (request) => {
  const { year } = request.params

  if (!offeredYears().includes(year)) {
    throw Boom.notFound()
  }

  return reportingPeriodOf(year)
}
