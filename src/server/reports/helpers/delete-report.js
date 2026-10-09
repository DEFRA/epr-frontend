import { backend } from '#server/common/helpers/backend-client.js'
import { reportPath } from './report-backend.js'

/**
 * Deletes a report for a specific period via the backend API.
 * @param {string} organisationId
 * @param {string} registrationId
 * @param {number} year
 * @param {string} cadence
 * @param {number} period
 * @param {number} submissionNumber
 * @param {string} backendToken
 * @returns {Promise<void>}
 */
export async function deleteReport(
  organisationId,
  registrationId,
  year,
  cadence,
  period,
  submissionNumber,
  backendToken
) {
  return backend(backendToken).delete(
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
