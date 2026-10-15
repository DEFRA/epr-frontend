import { fetchReportBackend } from './fetch-report-backend.js'
import { reportApiPath } from './report-paths.js'

/**
 * @import { SubmissionKeys } from './report-paths.js'
 */

/**
 * Updates a report via the backend PATCH endpoint.
 * @param {SubmissionKeys} keys
 * @param {Record<string, unknown>} fields - Fields to update (e.g. { supportingInformation } or { status })
 * @param {string} backendToken
 * @returns {Promise<unknown>}
 */
export async function updateReport(keys, fields, backendToken) {
  return fetchReportBackend(reportApiPath(keys), {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${backendToken}`
    },
    body: JSON.stringify(fields)
  })
}
