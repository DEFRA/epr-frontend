import { fetchStreamFromBackend } from '#server/common/helpers/fetch-stream-from-backend.js'

import { reportingPeriodNow } from './helpers/reporting-period.js'

/**
 * @import { HapiRequest, HapiServerRoute } from '#server/common/hapi-types.js'
 * @import { ResponseToolkit } from '@hapi/hapi'
 */

const DEFAULT_CONTENT_TYPE = 'application/zip'

/**
 * Serves every figure behind the market insights pages as a zip of CSVs.
 *
 * The backend builds the zip inside the request and this passes the body
 * straight through, so nothing is held here and nothing is stored. The
 * response takes tens of seconds, which is accepted: one regulator asks for it
 * at a time, rarely, and knows they asked.
 * @satisfies {Partial<HapiServerRoute<HapiRequest>>}
 */
export const marketInsightsExportController = {
  /**
   * @param {HapiRequest} request
   * @param {ResponseToolkit} h
   */
  async handler(request, h) {
    const { backendToken } = request.auth.credentials
    const { year, month } = reportingPeriodNow()

    const { body, contentDisposition, contentType } =
      await fetchStreamFromBackend(
        `/v1/market-insights/${year}/monthly/${month}/export.zip`,
        { method: 'GET', headers: { Authorization: `Bearer ${backendToken}` } }
      )

    const response = h.response(body).type(contentType ?? DEFAULT_CONTENT_TYPE)

    return contentDisposition
      ? response.header('Content-Disposition', contentDisposition)
      : response
  }
}
