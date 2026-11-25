import { paths } from '#server/paths.js'

import { reportingPeriodNow } from './helpers/reporting-period.js'
import { yearPath } from './helpers/year-path.js'

/**
 * @import { HapiRequest, HapiServerRoute } from '#server/common/hapi-types.js'
 * @import { ResponseToolkit } from '@hapi/hapi'
 */

/**
 * Sends the year-less market insights address to the current reporting year.
 * @satisfies {Partial<HapiServerRoute<HapiRequest>>}
 */
export const redirectToYearController = {
  /**
   * @param {HapiRequest} request
   * @param {ResponseToolkit} h
   */
  handler(request, h) {
    return h.redirect(
      request.localiseUrl(
        yearPath(paths.regulators.marketInsightsYear, reportingPeriodNow().year)
      )
    )
  }
}
