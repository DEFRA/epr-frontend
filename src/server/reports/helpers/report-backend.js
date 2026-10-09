import Boom from '@hapi/boom'

import { statusCodes } from '#server/common/constants/status-codes.js'
import { backend, path } from '#server/common/helpers/backend-client.js'
import { ReportStaleError, staleReasonsFromCode } from './stale.js'

/**
 * @typedef {{
 *   cadence: string,
 *   organisationId: string,
 *   period: number,
 *   registrationId: string,
 *   submissionNumber: number,
 *   year: number
 * }} ReportAddress
 */

/**
 * @param {ReportAddress} address
 */
export const reportPath = ({
  organisationId,
  registrationId,
  year,
  cadence,
  period,
  submissionNumber
}) =>
  path`/v1/organisations/${organisationId}/registrations/${registrationId}/reports/${year}/${cadence}/${period}/submissions/${submissionNumber}`

/**
 * A 409's `code` is not always a stale reason (e.g. a version conflict), so
 * only one carrying a recognised reason becomes a ReportStaleError.
 * @param {unknown} error
 * @returns {never}
 */
const asReportStale = (error) => {
  if (Boom.isBoom(error, statusCodes.conflict)) {
    const reasons = staleReasonsFromCode(error.output.payload?.code)

    if (reasons.length > 0) {
      throw new ReportStaleError(reasons)
    }
  }

  throw error
}

/**
 * The backend client for a report, which raises a stale report as
 * ReportStaleError.
 * @param {string} token
 */
export const reportBackend = (token) =>
  backend(token, { onError: asReportStale })
