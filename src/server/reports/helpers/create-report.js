import { backend } from '#server/common/helpers/backend-client.js'
import { reportPath } from './report-backend.js'

/**
 * @typedef {{
 *   id: string,
 *   status: string
 * }} CreateReportResponse
 */

/**
 * Creates an in-progress report for a specific period via the backend API.
 * @param {string} organisationId
 * @param {string} registrationId
 * @param {number} year
 * @param {string} cadence
 * @param {number} period
 * @param {number} submissionNumber
 * @param {string} backendToken
 * @returns {Promise<CreateReportResponse>}
 */
export async function createReport(
  organisationId,
  registrationId,
  year,
  cadence,
  period,
  submissionNumber,
  backendToken
) {
  return backend(backendToken).post(
    reportPath({
      organisationId,
      registrationId,
      year,
      cadence,
      period,
      submissionNumber
    })
  )
}
